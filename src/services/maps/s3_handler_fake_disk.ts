import { checkExists } from 'base/preconditions';
import { PromisedResult, Result, wrapError } from 'base/result';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getEnvVars } from 'services/env';
import * as unzipper from 'unzipper';
import { MintUploadUrlResult, S3Error, S3Handler } from './s3_handler_types';

// Disk-backed fake S3 handler for `bun dev` (selected via S3_IMPLEMENTATION=dev). Mirrors the
// key layout of the real S3 handler so the same temp -> permanent promotion flow works without
// an S3 bucket. Browser PUTs and GETs are served by /api/_dev/s3/[...path]; this class handles
// the server-side reads/writes directly against the filesystem. The in-memory counterpart used
// by tests is `MemoryFakeS3Handler` in s3_handler_fake_memory.ts.

// Resolve to an absolute path once at module load so per-request handlers don't depend on cwd.
function devS3Root(): string {
  return path.resolve(process.cwd(), process.env.DEV_S3_ROOT || '.fake_dev/s3');
}

const mapKey = (id: string, temp: boolean) => `maps/${id}.zip` + (temp ? '.temp' : '');
const albumArtPrefix = (id: string, temp: boolean) => `albumArt/${id}` + (temp ? '_temp/' : '/');

function devS3Path(key: string): string {
  return path.join(devS3Root(), key);
}

async function readFile(key: string): PromisedResult<Buffer, S3Error> {
  try {
    return { success: true, value: await fs.readFile(devS3Path(key)) };
  } catch (e) {
    return { success: false, errors: [wrapError(e, S3Error.S3_GET_ERROR, { key })] };
  }
}

async function writeFile(key: string, body: Buffer): Promise<Result<undefined, S3Error>> {
  try {
    const filePath = devS3Path(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return { success: true, value: undefined };
  } catch (e) {
    return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { key })] };
  }
}

async function removeFile(key: string): Promise<void> {
  await fs.rm(devS3Path(key), { force: true });
}

async function removeDir(prefix: string): Promise<void> {
  // Mirror S3 prefix semantics: `albumArt/{id}/` corresponds to a directory we can blow away whole.
  await fs.rm(devS3Path(prefix), { recursive: true, force: true });
}

async function moveFile(src: string, dst: string): Promise<Result<undefined, S3Error>> {
  try {
    const dstPath = devS3Path(dst);
    await fs.mkdir(path.dirname(dstPath), { recursive: true });
    await fs.rename(devS3Path(src), dstPath);
    return { success: true, value: undefined };
  } catch (e) {
    return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { src, dst })] };
  }
}

// Browser-facing wrappers: the dev S3 route handler reads/writes through these so its disk layout
// stays in sync with the server-side handler.
export const devS3 = {
  read: readFile,
  write: writeFile,
};

export class FileFakeS3Handler implements S3Handler {
  async uploadAlbumArtFiles(
    id: string,
    albumArtFiles: unzipper.File[],
    temp: boolean
  ): Promise<Result<string | undefined, S3Error>> {
    for (const a of albumArtFiles) {
      const albumArt = checkExists(a, 'albumArt');
      const filename = path.basename(albumArt.path);
      const writeResult = await writeFile(
        `${albumArtPrefix(id, temp)}${filename}`,
        await albumArt.buffer()
      );
      if (!writeResult.success) return writeResult;
    }
    return {
      success: true,
      value: albumArtFiles.length > 0 ? path.basename(albumArtFiles[0]!.path) : undefined,
    };
  }

  async getMapFile(id: string, temp: boolean): PromisedResult<Buffer, S3Error> {
    return readFile(mapKey(id, temp));
  }

  async mintUploadUrl(id: string): Promise<MintUploadUrlResult> {
    // Browser PUTs land at /api/_dev/s3/[...path] which writes to the same disk root. We use
    // publicS3BaseUrl so the same setting also serves the redirect routes for downloads / album
    // art (those redirect to `${publicS3BaseUrl}/maps/...` and `${publicS3BaseUrl}/albumArt/...`).
    return { success: true, value: `${getEnvVars().publicS3BaseUrl}/${mapKey(id, true)}` };
  }

  async deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>> {
    await Promise.all([removeFile(mapKey(id, temp)), removeDir(albumArtPrefix(id, temp))]);
    return { success: true, value: undefined };
  }

  async promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error> {
    await this.deleteFiles(id, false);
    const moveMap = await moveFile(mapKey(id, true), mapKey(id, false));
    if (!moveMap.success) return moveMap;
    try {
      const tempDir = devS3Path(albumArtPrefix(id, true));
      const entries = await fs.readdir(tempDir).catch(() => [] as string[]);
      for (const entry of entries) {
        const move = await moveFile(
          `${albumArtPrefix(id, true)}${entry}`,
          `${albumArtPrefix(id, false)}${entry}`
        );
        if (!move.success) return move;
      }
      await fs.rmdir(tempDir).catch(() => undefined);
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { id })] };
    }
    return { success: true, value: undefined };
  }
}
