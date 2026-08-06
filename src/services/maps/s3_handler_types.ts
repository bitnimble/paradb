import { FileEntry, Reader } from '@zip.js/zip.js';
import { PromisedResult, Result } from 'base/result';

/**
 * A map archive in blob storage, opened for random access: the zip's central directory and the few
 * entries validation actually reads are fetched on demand, so a large archive is never held in
 * memory in full.
 */
export type MapArchive = { reader: Reader<unknown>; size: number };

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
    albumArtFiles: FileEntry[],
    temp: boolean
  ): Promise<Result<string | undefined, S3Error>>;
  openMapFile(id: string, temp: boolean): PromisedResult<MapArchive, S3Error>;
  mintUploadUrl(id: string): Promise<MintUploadUrlResult>;
  deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>>;
  promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error>;
}
