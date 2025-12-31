import { NextConfig } from 'next';

const { withSentryConfig } = require('@sentry/nextjs');

const s3Url = process.env.PUBLIC_S3_BASE_URL;
const nextConfig: NextConfig = {
  distDir: process.env.BUILD_DIR || '.next',
  reactStrictMode: true,
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  images: {
    // Album art s3 buckets
    remotePatterns: [
      new URL('https://maps-dev.paradb.net/albumArt/**'),
      new URL('https://maps.paradb.net/albumArt/**'),
      ...(s3Url ? [new URL(s3Url + '/albumArt/**')] : []),
    ],
  },
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: 'bitnimble',
    project: 'paradb',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    tunnelRoute: '/monitoring',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
    excludeServerRoutes: ['/api/users/session'],
  }
);
