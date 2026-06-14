import { PromisedResult, wrapError } from 'base/result';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MintUploadUrlResult, S3Bucket, S3Error } from './s3_bucket';

// Disk-backed fake bucket for `bun dev`. Browser PUTs/GETs are served by /api/dev/s3/[...path]
// through the exported diskRead/diskWrite.

// Resolve to an absolute path per call so handlers don't depend on the ambient cwd.
function devS3Root(): string {
  return path.resolve(process.cwd(), process.env.DEV_S3_ROOT || '.fake_dev/s3');
}

function devS3Path(key: string): string {
  return path.join(devS3Root(), key);
}

export async function diskRead(key: string): PromisedResult<Buffer, S3Error> {
  try {
    return { success: true, value: await fs.readFile(devS3Path(key)) };
  } catch (e) {
    return { success: false, errors: [wrapError(e, S3Error.S3_GET_ERROR, { key })] };
  }
}

export async function diskWrite(key: string, body: Buffer): PromisedResult<undefined, S3Error> {
  try {
    const filePath = devS3Path(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return { success: true, value: undefined };
  } catch (e) {
    return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { key })] };
  }
}

export class DiskBucket implements S3Bucket {
  constructor(private readonly publicBaseUrl: string) {}

  get(key: string): PromisedResult<Buffer, S3Error> {
    return diskRead(key);
  }

  put(key: string, body: Buffer): PromisedResult<undefined, S3Error> {
    return diskWrite(key, body);
  }

  async delete(keys: string[]): PromisedResult<undefined, S3Error> {
    try {
      await Promise.all(keys.map((key) => fs.rm(devS3Path(key), { force: true })));
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_DELETE_ERROR, { keys })] };
    }
  }

  async move(oldKey: string, newKey: string): PromisedResult<undefined, S3Error> {
    try {
      const dstPath = devS3Path(newKey);
      await fs.mkdir(path.dirname(dstPath), { recursive: true });
      await fs.rename(devS3Path(oldKey), dstPath);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { oldKey, newKey })] };
    }
  }

  async list(prefix: string): PromisedResult<string[], S3Error> {
    // Map prefix semantics onto a directory listing: callers list a `foo/bar/`-style prefix that
    // corresponds to a directory. A missing directory just means no objects, not an error.
    const entries = await fs.readdir(devS3Path(prefix)).catch(() => [] as string[]);
    return { success: true, value: entries.map((entry) => `${prefix}${entry}`) };
  }

  async signUploadUrl(key: string): Promise<MintUploadUrlResult> {
    // The browser PUTs here and /api/dev/s3/[...path] writes it to the same disk root.
    return { success: true, value: `${this.publicBaseUrl}/${key}` };
  }
}
