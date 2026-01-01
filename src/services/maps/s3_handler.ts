import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { checkExists } from 'base/preconditions';
import { PromisedResult, Result } from 'base/result';
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

async function s3Put(
  key: string,
  buffer: Buffer,
  contentType: string
): PromisedResult<undefined, S3Error> {
  try {
    const s3 = getS3Client();
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return {
      success: true,
      value: undefined,
    };
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
}

async function s3Delete(keys: string[]): PromisedResult<undefined, S3Error> {
  try {
    const s3 = getS3Client();
    await s3.client.send(
      new DeleteObjectsCommand({
        Bucket: s3.bucket,
        Delete: {
          Objects: keys.map((k) => ({ Key: k })),
        },
      })
    );
    return { success: true, value: undefined };
  } catch (e) {
    return { success: false, errors: [{ type: S3Error.S3_DELETE_ERROR }] };
  }
}

function guessContentType(filename: string): string {
  if (filename.endsWith('png')) {
    return 'image/png';
  } else if (filename.endsWith('jpg') || filename.endsWith('jpeg')) {
    return 'image/jpeg';
  } else if (filename.endsWith('bmp')) {
    return 'image/bmp';
  } else if (filename.endsWith('gif')) {
    return 'image/gif';
  } else if (filename.endsWith('webp')) {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

export async function uploadFiles(opts: {
  id: string;
  buffer: Buffer;
  albumArtFiles: unzipper.File[];
}): Promise<Result<string | undefined, S3Error>> {
  // Upload map file to the bucket
  const mapPutResult = await s3Put(`maps/${opts.id}.zip`, opts.buffer, 'application/zip');
  if (!mapPutResult.success) {
    return mapPutResult;
  }

  // Write album art files to S3
  // TODO: display all of the album arts in the FE, e.g. in a carousel, or when selecting a difficulty
  await Promise.all(
    opts.albumArtFiles.map(async (a) => {
      const albumArt = checkExists(a, 'albumArt');
      const buffer = await albumArt.buffer();
      const filename = path.basename(albumArt.path);
      return s3Put(`albumArt/${opts.id}/${filename}`, buffer, guessContentType(filename));
    })
  );

  return {
    success: true,
    value: opts.albumArtFiles.length > 0 ? path.basename(opts.albumArtFiles[0]!.path) : undefined,
  };
}

export async function deleteFiles(opts: { id: string }): Promise<Result<undefined, S3Error>> {
  const mapDeleteResult = await s3Delete([`maps/${opts.id}.zip`]);
  if (!mapDeleteResult.success) {
    return mapDeleteResult;
  }

  try {
    const s3 = getS3Client();
    const albumArtFiles = await s3.client.send(
      new ListObjectsV2Command({
        Bucket: s3.bucket,
        Prefix: `albumArt/${opts.id}`,
      })
    );
    await s3Delete(
      albumArtFiles.Contents?.map((c) => c.Key).filter((k): k is string => k != null) || []
    );
  } catch (e) {
    // TODO: log error to Sentry
  }

  return { success: true, value: undefined };
}
