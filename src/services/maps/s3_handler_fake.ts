import { PromisedResult, Result } from 'base/result';
import * as unzipper from 'unzipper';
import { MintUploadUrlResult, S3Error, S3Handler } from './s3_handler_types';

/**
 * In-memory S3 handler that returns hardcoded fake data. Used in tests (selected via
 * `S3_IMPLEMENTATION=fake`) so they don't require a real S3 bucket / minio.
 */
export class FakeS3Handler implements S3Handler {
  async uploadAlbumArtFiles(
    _id: string,
    _albumArtFiles: unzipper.File[],
    _temp: boolean
  ): Promise<Result<string | undefined, S3Error>> {
    return { success: true, value: 'album.jpg' };
  }

  async getMapFile(_id: string, _temp: boolean): PromisedResult<Buffer, S3Error> {
    return { success: true, value: Buffer.from('fake-map') };
  }

  async mintUploadUrl(id: string): Promise<MintUploadUrlResult> {
    return { success: true, value: `https://fake-s3.local/upload/${id}` };
  }

  async deleteFiles(_id: string, _temp: boolean): Promise<Result<undefined, S3Error>> {
    return { success: true, value: undefined };
  }

  async promoteTempMapFiles(_id: string): PromisedResult<undefined, S3Error> {
    return { success: true, value: undefined };
  }
}
