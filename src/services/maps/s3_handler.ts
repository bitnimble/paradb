import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { checkExists } from 'base/preconditions';
import { PromisedResult, Result, wrapError } from 'base/result';
import * as path from 'path';
import { getEnvVars } from 'services/env';
import * as unzipper from 'unzipper';

let s3: { client: S3Client; bucket: string } | undefined;

// TODO: this won't be safe for collisions if the same user reuploads against the same map multiple
// times at the same time
const mapKey = (id: string, temp: boolean) => `maps/${id}.zip` + (temp ? '.temp' : '');
const albumArtPrefix = (id: string, temp: boolean) => `albumArt/${id}` + (temp ? '_temp/' : '/');

export const enum S3Error {
  S3_GET_ERROR = 's3_get_error',
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
        requestChecksumCalculation: 'WHEN_REQUIRED',
      }),
      bucket: envVars.s3MapsBucket,
    };
  }

  return s3;
}

async function s3Get(key: string): PromisedResult<Buffer, S3Error> {
  try {
    const s3 = getS3Client();
    const resp = await s3.client.send(
      new GetObjectCommand({
        Bucket: s3.bucket,
        Key: key,
      })
    );
    if (!resp.Body) {
      return {
        success: false,
        errors: [
          {
            type: S3Error.S3_GET_ERROR,
            internalMessage: 'Missing S3 body',
          },
        ],
      };
    }
    return {
      success: true,
      value: Buffer.from(await resp.Body.transformToByteArray()),
    };
  } catch (e) {
    return {
      success: false,
      errors: [wrapError(e, S3Error.S3_GET_ERROR)],
    };
  }
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
  if (keys.length === 0) {
    return { success: true, value: undefined };
  }
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
  } catch {
    return { success: false, errors: [{ type: S3Error.S3_DELETE_ERROR }] };
  }
}

async function s3Move(oldKey: string, newKey: string): PromisedResult<undefined, S3Error> {
  try {
    const s3 = getS3Client();
    // Copy
    await s3.client.send(
      new CopyObjectCommand({
        Bucket: s3.bucket,
        Key: newKey,
        CopySource: `${s3.bucket}/${oldKey}`,
      })
    );
    // Delete old
    await s3.client.send(
      new DeleteObjectCommand({
        Bucket: s3.bucket,
        Key: oldKey,
      })
    );
    return { success: true, value: undefined };
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

export async function uploadAlbumArtFiles(
  id: string,
  albumArtFiles: unzipper.File[],
  temp: boolean
): Promise<Result<string | undefined, S3Error>> {
  // Write album art files to S3
  // TODO: display all of the album arts in the FE, e.g. in a carousel, or when selecting a difficulty
  await Promise.all(
    albumArtFiles.map(async (a) => {
      const albumArt = checkExists(a, 'albumArt');
      const buffer = await albumArt.buffer();
      const filename = path.basename(albumArt.path);
      return s3Put(`${albumArtPrefix(id, temp)}${filename}`, buffer, guessContentType(filename));
    })
  );

  return {
    success: true,
    value: albumArtFiles.length > 0 ? path.basename(albumArtFiles[0]!.path) : undefined,
  };
}

export async function getMapFile(id: string, temp: boolean) {
  return s3Get(mapKey(id, temp));
}

export async function mintUploadUrl(id: string) {
  try {
    const s3 = getS3Client();
    const resp = await getSignedUrl(
      s3.client,
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: mapKey(id, true),
        ContentType: 'application/zip',
      }),
      { expiresIn: 3600 } // 1 hour
    );
    return { success: true, value: resp } as const;
  } catch {
    return { success: false } as const;
  }
}

export async function deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>> {
  const [mapDeleteResult] = await Promise.all([
    // Delete map file
    s3Delete([mapKey(id, temp)]),
    // Delete album art
    (async () => {
      try {
        const s3 = getS3Client();
        const albumArtFiles = await s3.client.send(
          new ListObjectsV2Command({
            Bucket: s3.bucket,
            Prefix: albumArtPrefix(id, temp),
          })
        );

        // May throw error if key doesn't exist - that's fine, maybe it was a pre-S3 map
        await s3Delete(
          albumArtFiles.Contents?.map((c) => c.Key).filter((k): k is string => k != null) || []
        );
      } catch {
        // TODO: log error to Sentry?
      }
    })(),
  ]);

  if (!mapDeleteResult.success) {
    return mapDeleteResult;
  }
  return { success: true, value: undefined };
}

export async function promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error> {
  // Delete originals, if they exist - this may error if this is a new map
  await deleteFiles(id, false);

  // Move temp to permanent
  const moveMapResult = await s3Move(mapKey(id, true), mapKey(id, false));
  if (!moveMapResult.success) {
    return moveMapResult;
  }

  // Move album art files
  try {
    const s3 = getS3Client();
    const albumArtFiles = await s3.client.send(
      new ListObjectsV2Command({
        Bucket: s3.bucket,
        Prefix: albumArtPrefix(id, true),
      })
    );
    const albumArtKeys =
      albumArtFiles.Contents?.map((c) => c.Key).filter((k): k is string => k != null) || [];
    await Promise.all(
      albumArtKeys.map((key) =>
        s3Move(key, key.replace(albumArtPrefix(id, true), albumArtPrefix(id, false)))
      )
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

  return { success: true, value: undefined };
}
