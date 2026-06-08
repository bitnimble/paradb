/**
 * Prepares the Minio bucket the E2E suite uploads to. Run once after Minio is up and before the
 * tests (see tools/e2e.sh): creates the maps bucket if missing and grants anonymous read on its
 * objects, because the map download route redirects the browser straight to the public object URL.
 *
 * Reads S3 config straight from the environment (provided by .env.e2e) rather than the app's
 * getEnvVars() so it stays a standalone script with no app singletons.
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT!;
const region = process.env.S3_REGION!;
const bucket = process.env.S3_MAPS_BUCKET!;
const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
const secretAccessKey = process.env.S3_ACCESS_KEY_SECRET!;

async function main() {
  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} already exists`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Created bucket ${bucket}`);
  }

  // Anonymous read on objects so the download redirect (browser -> Minio public URL) works.
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
  await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
  console.log(`Set public-read policy on ${bucket}`);
}

main().catch((e) => {
  console.error('Failed to set up Minio bucket:', e);
  process.exit(1);
});
