import { PromisedResult, Result } from 'base/result';
import * as unzipper from 'unzipper';

export const enum S3Error {
  S3_GET_ERROR = 's3_get_error',
  S3_WRITE_ERROR = 's3_write_error',
  S3_DELETE_ERROR = 's3_delete_error',
}

export type MintUploadUrlResult =
  | { success: true; value: string }
  | { success: false; error: unknown };

/**
 * Handles blob storage for map archives and album art. The real implementation talks to S3; a
 * fake implementation (selected via the `S3_IMPLEMENTATION` env var) returns hardcoded data so
 * tests can run without a real bucket.
 */
export interface S3Handler {
  uploadAlbumArtFiles(
    id: string,
    albumArtFiles: unzipper.File[],
    temp: boolean
  ): Promise<Result<string | undefined, S3Error>>;
  getMapFile(id: string, temp: boolean): PromisedResult<Buffer, S3Error>;
  mintUploadUrl(id: string): Promise<MintUploadUrlResult>;
  deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>>;
  promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error>;
}
