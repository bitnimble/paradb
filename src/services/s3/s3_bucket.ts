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
import { PromisedResult, wrapError } from 'base/result';
import { getEnvVars } from 'services/env';

export const enum S3Error {
  S3_GET_ERROR = 's3_get_error',
  S3_WRITE_ERROR = 's3_write_error',
  S3_DELETE_ERROR = 's3_delete_error',
}

export type MintUploadUrlResult =
  | { success: true; value: string }
  | { success: false; error: unknown };

export interface S3Bucket {
  get(key: string): PromisedResult<Buffer, S3Error>;
  put(key: string, body: Buffer, contentType: string): PromisedResult<undefined, S3Error>;
  delete(keys: string[]): PromisedResult<undefined, S3Error>;
  move(oldKey: string, newKey: string): PromisedResult<undefined, S3Error>;
  list(prefix: string): PromisedResult<string[], S3Error>;
  signUploadUrl(key: string, contentType: string): Promise<MintUploadUrlResult>;
}

export function guessContentType(filename: string): string {
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
  } else if (filename.endsWith('zip')) {
    return 'application/zip';
  }
  return 'application/octet-stream';
}

export class RealS3Bucket implements S3Bucket {
  private client: S3Client | undefined;

  constructor(private readonly bucket: string) {}

  private getClient(): S3Client {
    if (this.client == null) {
      const env = getEnvVars();
      this.client = new S3Client({
        endpoint: env.s3Endpoint,
        region: env.s3Region,
        credentials: {
          accessKeyId: env.s3AccessKeyId,
          secretAccessKey: env.s3AccessKeySecret,
        },
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }

  async get(key: string): PromisedResult<Buffer, S3Error> {
    try {
      const resp = await this.getClient().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      if (!resp.Body) {
        return {
          success: false,
          errors: [
            { type: S3Error.S3_GET_ERROR, internalMessage: 'Missing S3 body', details: { key } },
          ],
        };
      }
      return { success: true, value: Buffer.from(await resp.Body.transformToByteArray()) };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_GET_ERROR, { key })] };
    }
  }

  async put(key: string, body: Buffer, contentType: string): PromisedResult<undefined, S3Error> {
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      return { success: true, value: undefined };
    } catch (e) {
      return {
        success: false,
        errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { key, contentType })],
      };
    }
  }

  async delete(keys: string[]): PromisedResult<undefined, S3Error> {
    if (keys.length === 0) {
      return { success: true, value: undefined };
    }
    try {
      await this.getClient().send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.map((k) => ({ Key: k })) },
        })
      );
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_DELETE_ERROR, { keys })] };
    }
  }

  async move(oldKey: string, newKey: string): PromisedResult<undefined, S3Error> {
    try {
      const client = this.getClient();
      await client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: newKey,
          CopySource: `${this.bucket}/${oldKey}`,
        })
      );
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: oldKey }));
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_WRITE_ERROR, { oldKey, newKey })] };
    }
  }

  async list(prefix: string): PromisedResult<string[], S3Error> {
    try {
      const resp = await this.getClient().send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix })
      );
      const keys = resp.Contents?.map((c) => c.Key).filter((k): k is string => k != null) ?? [];
      return { success: true, value: keys };
    } catch (e) {
      return { success: false, errors: [wrapError(e, S3Error.S3_GET_ERROR, { prefix })] };
    }
  }

  async signUploadUrl(key: string, contentType: string): Promise<MintUploadUrlResult> {
    try {
      const url = await getSignedUrl(
        this.getClient(),
        new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
        { expiresIn: 3600 }
      );
      return { success: true, value: url };
    } catch (e) {
      return { success: false, error: e };
    }
  }
}
