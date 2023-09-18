import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { checkExists } from 'base/preconditions';
import { Result } from 'base/result';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getEnvVars } from 'services/env';
import * as unzipper from 'unzipper';

let s3: { client: S3Client; bucket: string } | undefined;

export const enum S3Error {
  S3_WRITE_ERROR = 's3_write_error',
  S3_DELETE_ERROR = 's3_delete_error',
}

function getS3Client() {
  if (s3 == null) {
    const envVars = getEnvVars();
    s3 = {
      client: new S3Client({
        endpoint: envVars.s3Endpoint,
        region: envVars.s3Region,
        credentials: {
          accessKeyId: envVars.s3AccessKeyId,
          secretAccessKey: envVars.s3AccessKeySecret,
        },
        forcePathStyle: true,
      }),
      bucket: envVars.s3MapsBucket,
    };
  }

  return s3;
}

export async function uploadFiles(opts: {
  id: string;
  mapsDir: string;
  buffer: Buffer;
  albumArtFiles: unzipper.File[];
}): Promise<Result<string | undefined, S3Error>> {
  // Upload it to the bucket
  try {
    const s3 = getS3Client();
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: `maps/${opts.id}.zip`,
        Body: opts.buffer,
        ContentType: 'application/zip',
      })
    );
  } catch (e) {
    return {
      success: false,
      errors: [
        {
          type: S3Error.S3_WRITE_ERROR,
          internalMessage: (e as Error).message,
          stack: (e as Error).stack,
        },
      ],
    };
  }

  // TODO: write it to disk and upload it to the bucket via a worker thread to speed up the
  // upload map flow.
  // Then, on download, check whether it's on disk and serve it from there first.
  // When the upload completes, delete it from disk.
  // const mapFilename = opts.id + '.zip';
  // const filepath = path.resolve(opts.mapsDir, mapFilename);
  // await fs.writeFile(filepath, opts.buffer);

  // For now, write all of the album art files to the on-disk maps directory.
  // TODO: display all of the album arts in the FE, e.g. in a carousel, or when selecting a difficulty
  const albumArtFolderPath = path.resolve(opts.mapsDir, opts.id);
  await fs.mkdir(albumArtFolderPath);
  await Promise.all(
    opts.albumArtFiles.map((a) => {
      const albumArt = checkExists(a, 'albumArt');
      const albumArtPath = path.resolve(albumArtFolderPath, path.basename(albumArt.path));
      return albumArt.buffer().then((b) => fs.writeFile(albumArtPath, b));
    })
  );

  return {
    success: true,
    // All file paths persisted in the DB are relative to mapsDir
    value: opts.albumArtFiles.length > 0 ? path.basename(opts.albumArtFiles[0]!.path) : undefined,
  };
}

export async function deleteFiles(opts: {
  mapsDir: string;
  id: string;
}): Promise<Result<undefined, S3Error>> {
  try {
    const s3 = getS3Client();
    await s3.client.send(
      new DeleteObjectCommand({ Bucket: s3.bucket, Key: `maps/${opts.id}.zip` })
    );
  } catch (e) {
    return { success: false, errors: [{ type: S3Error.S3_DELETE_ERROR }] };
  }

  const albumArtFolderPath = path.resolve(opts.mapsDir, opts.id);
  await fs.rm(albumArtFolderPath, { recursive: true, force: true });

  return { success: true, value: undefined };
}
