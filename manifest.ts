import { PageManifest } from '../../../config/manifest';

export const manifest: PageManifest = {
  title: 'ParaDB',
  head: {
    googleFonts: [],
  },
  fallback: {
    'crypto': 'crypto-browserify',
    'util': 'util/',
    'stream': 'stream-browserify',
  },
};
