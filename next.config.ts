import { NextConfig } from 'next';

import { withSentryConfig } from '@sentry/nextjs';

const s3Url = process.env.PUBLIC_S3_BASE_URL;
const nextConfig: NextConfig = {
  distDir: process.env.BUILD_DIR || '.next',
  reactStrictMode: true,
  images: {
    // Album art s3 buckets
    remotePatterns: [
      new URL('https://maps-dev.paradb.net/albumArt/**'),
      new URL('https://maps.paradb.net/albumArt/**'),
      ...(s3Url ? [new URL(s3Url + '/albumArt/**')] : []),
    ],
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'bitnimble',
  project: 'paradb',

  // Suppresses source map uploading logs during build
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // TODO: enable tunnelling for adblock?

  bundleSizeOptimizations: {
    excludeTracing: true,
    excludeDebugStatements: true,
  },
});
