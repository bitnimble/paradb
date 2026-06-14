import { getEnvVars } from 'services/env';
import { DiskBucket } from './disk_bucket';
import { getSharedMemoryBucket } from './memory_bucket';
import { RealS3Bucket, S3Bucket } from './s3_bucket';

// In fake mode every bucket shares one in-memory store, so the dev S3 route and all domains see the
// same objects.
export function createS3Bucket(bucket: string, publicBaseUrl: string): S3Bucket {
  switch (getEnvVars().s3Implementation) {
    case 'fake':
      return getSharedMemoryBucket();
    case 'dev':
      return new DiskBucket(publicBaseUrl);
    default:
      return new RealS3Bucket(bucket);
  }
}
