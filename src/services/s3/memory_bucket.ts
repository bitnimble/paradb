import { PromisedResult } from 'base/result';
import { getSingleton } from 'services/singleton';
import { MintUploadUrlResult, S3Bucket, S3Error } from './s3_bucket';

// Cap on the total bytes held by the in-memory fake. It keeps every uploaded buffer so it can be
// served back, so a runaway test could otherwise grow it unbounded. Generous relative to anything a
// test should store; exceeding it throws rather than silently dropping data.
const MEMORY_CAP_BYTES = 64 * 1024 * 1024;

// One shared instance backs every fake-mode bucket (see getSharedMemoryBucket), so keys must stay
// globally unique across domains (maps/, albumArt/, avatars/).
export class MemoryBucket implements S3Bucket {
  private objects = new Map<string, { body: Buffer; contentType: string }>();
  private totalBytes = 0;

  /** Test seam: clear all stored objects; call between tests. */
  _reset() {
    this.objects.clear();
    this.totalBytes = 0;
  }

  async get(key: string): PromisedResult<Buffer, S3Error> {
    const object = this.objects.get(key);
    if (object == null) {
      return {
        success: false,
        errors: [
          { type: S3Error.S3_GET_ERROR, internalMessage: `No fake object stored for ${key}` },
        ],
      };
    }
    return { success: true, value: object.body };
  }

  async put(key: string, body: Buffer, contentType: string): PromisedResult<undefined, S3Error> {
    const previous = this.objects.get(key);
    const delta = body.length - (previous?.body.length ?? 0);
    if (this.totalBytes + delta > MEMORY_CAP_BYTES) {
      throw new Error(`MemoryBucket exceeded its ${MEMORY_CAP_BYTES}-byte cap storing ${key}`);
    }
    this.objects.set(key, { body, contentType });
    this.totalBytes += delta;
    return { success: true, value: undefined };
  }

  async delete(keys: string[]): PromisedResult<undefined, S3Error> {
    for (const key of keys) {
      const object = this.objects.get(key);
      if (object != null) {
        this.totalBytes -= object.body.length;
        this.objects.delete(key);
      }
    }
    return { success: true, value: undefined };
  }

  async move(oldKey: string, newKey: string): PromisedResult<undefined, S3Error> {
    const object = this.objects.get(oldKey);
    if (object == null) {
      return {
        success: false,
        errors: [
          { type: S3Error.S3_GET_ERROR, internalMessage: `No fake object to move at ${oldKey}` },
        ],
      };
    }
    const overwritten = this.objects.get(newKey);
    if (overwritten != null) {
      this.totalBytes -= overwritten.body.length;
    }
    this.objects.set(newKey, object);
    this.objects.delete(oldKey);
    return { success: true, value: undefined };
  }

  async list(prefix: string): PromisedResult<string[], S3Error> {
    return {
      success: true,
      value: [...this.objects.keys()].filter((key) => key.startsWith(prefix)),
    };
  }

  async signUploadUrl(key: string): Promise<MintUploadUrlResult> {
    // Tests seed uploads by calling put() directly, so this URL is never PUT to; it just needs to
    // be a stable non-empty value.
    return { success: true, value: `https://fake-s3.local/upload/${key}` };
  }
}

/**
 * The process-wide in-memory bucket shared by every fake-mode bucket and the dev S3 route. Backed by
 * getSingleton (globalThis) so it stays one instance even if Next loads this module in more than one
 * route context.
 */
export function getSharedMemoryBucket(): MemoryBucket {
  return getSingleton('_sharedMemoryBucket', () => new MemoryBucket());
}
