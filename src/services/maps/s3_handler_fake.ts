import { PromisedResult, Result } from 'base/result';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { MintUploadUrlResult, S3Error, S3Handler } from './s3_handler_types';

/**
 * In-memory S3 handler used in tests (selected via `S3_IMPLEMENTATION=fake`) so they don't require a
 * real S3 bucket / minio. Unlike a pure stub it actually round-trips uploaded map archives: a test
 * seeds the upload with `_putMapFileForTesting` (standing in for the client's PUT to the presigned
 * URL), and getMapFile / promoteTempMapFiles / deleteFiles then behave like the real handler's
 * temp-vs-permanent storage, so the upload-completion flow can be exercised end to end.
 */
export class FakeS3Handler implements S3Handler {
  // Map archive bytes keyed by id. Pending uploads live in `temp` and are promoted to `permanent`
  // by promoteTempMapFiles, mirroring the real handler's `.temp` suffix scheme.
  private tempMapFiles = new Map<string, Buffer>();
  private permanentMapFiles = new Map<string, Buffer>();

  private mapFileStore(temp: boolean) {
    return temp ? this.tempMapFiles : this.permanentMapFiles;
  }

  /** Test seam: stand in for the client uploading a zip to the presigned URL (writes to temp). */
  _putMapFileForTesting(id: string, buffer: Buffer) {
    this.tempMapFiles.set(id, buffer);
  }

  /** Test seam: clear all stored files; call between tests. */
  _resetForTesting() {
    this.tempMapFiles.clear();
    this.permanentMapFiles.clear();
  }

  async uploadAlbumArtFiles(
    _id: string,
    albumArtFiles: unzipper.File[],
    _temp: boolean
  ): Promise<Result<string | undefined, S3Error>> {
    return {
      success: true,
      value: albumArtFiles.length > 0 ? path.basename(albumArtFiles[0]!.path) : undefined,
    };
  }

  async getMapFile(id: string, temp: boolean): PromisedResult<Buffer, S3Error> {
    const buffer = this.mapFileStore(temp).get(id);
    if (buffer == null) {
      return {
        success: false,
        errors: [
          {
            type: S3Error.S3_GET_ERROR,
            internalMessage: `No fake map file stored for ${id} (temp=${temp})`,
          },
        ],
      };
    }
    return { success: true, value: buffer };
  }

  async mintUploadUrl(id: string): Promise<MintUploadUrlResult> {
    return { success: true, value: `https://fake-s3.local/upload/${id}` };
  }

  async deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>> {
    this.mapFileStore(temp).delete(id);
    return { success: true, value: undefined };
  }

  async promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error> {
    const pending = this.tempMapFiles.get(id);
    if (pending != null) {
      this.permanentMapFiles.set(id, pending);
      this.tempMapFiles.delete(id);
    }
    return { success: true, value: undefined };
  }
}
