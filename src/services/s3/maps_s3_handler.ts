import { checkExists } from 'base/preconditions';
import { PromisedResult, Result } from 'base/result';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { MintUploadUrlResult, S3Bucket, S3Error, guessContentType } from './s3_bucket';

export const mapKey = (id: string, temp: boolean) => `maps/${id}.zip` + (temp ? '.temp' : '');
const albumArtPrefix = (id: string, temp: boolean) => `albumArt/${id}` + (temp ? '_temp/' : '/');

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

export class MapsS3Handler implements S3Handler {
  constructor(private readonly bucket: S3Bucket) {}

  async uploadAlbumArtFiles(
    id: string,
    albumArtFiles: unzipper.File[],
    temp: boolean
  ): Promise<Result<string | undefined, S3Error>> {
    for (const a of albumArtFiles) {
      const albumArt = checkExists(a, 'albumArt');
      const filename = path.basename(albumArt.path);
      const putResult = await this.bucket.put(
        `${albumArtPrefix(id, temp)}${filename}`,
        await albumArt.buffer(),
        guessContentType(filename)
      );
      if (!putResult.success) {
        return putResult;
      }
    }
    return {
      success: true,
      value: albumArtFiles.length > 0 ? path.basename(albumArtFiles[0]!.path) : undefined,
    };
  }

  getMapFile(id: string, temp: boolean): PromisedResult<Buffer, S3Error> {
    return this.bucket.get(mapKey(id, temp));
  }

  mintUploadUrl(id: string): Promise<MintUploadUrlResult> {
    return this.bucket.signUploadUrl(mapKey(id, true), 'application/zip');
  }

  async deleteFiles(id: string, temp: boolean): Promise<Result<undefined, S3Error>> {
    const albumArt = await this.bucket.list(albumArtPrefix(id, temp));
    const albumArtKeys = albumArt.success ? albumArt.value : [];
    return this.bucket.delete([mapKey(id, temp), ...albumArtKeys]);
  }

  async promoteTempMapFiles(id: string): PromisedResult<undefined, S3Error> {
    // Delete the existing permanent files first, if any (this may be a brand-new map).
    await this.deleteFiles(id, false);

    const moveMap = await this.bucket.move(mapKey(id, true), mapKey(id, false));
    if (!moveMap.success) {
      return moveMap;
    }

    const tempAlbumArt = await this.bucket.list(albumArtPrefix(id, true));
    if (!tempAlbumArt.success) {
      return tempAlbumArt;
    }
    for (const key of tempAlbumArt.value) {
      const moved = await this.bucket.move(
        key,
        key.replace(albumArtPrefix(id, true), albumArtPrefix(id, false))
      );
      if (!moved.success) {
        return moved;
      }
    }
    return { success: true, value: undefined };
  }
}
