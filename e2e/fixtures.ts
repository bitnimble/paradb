import path from 'node:path';

/**
 * Canonical metadata for the committed map fixtures under `e2e/fixtures/`. The values here MUST match
 * the `recordingMetadata` baked into the zips (see `e2e/fixtures/README.md`); the tests assert on
 * them and drive search/filter from them, so distinct artist/mapper/description across the two maps
 * is what makes the filter assertions meaningful.
 */
export type MapFixture = {
  /** Absolute path to the zip, ready for `setInputFiles`. */
  zipPath: string;
  title: string;
  artist: string;
  mapper: string;
  description: string;
  /** The file entries the downloaded zip must contain (directories excluded). */
  expectedEntries: string[];
};

const fixturesDir = path.join(__dirname, 'fixtures');

export const MAP_ONE: MapFixture = {
  zipPath: path.join(fixturesDir, 'E2E_Map_One.zip'),
  title: 'E2E Map One Alpha',
  artist: 'Aurora Borealis',
  mapper: 'MapperAlpha',
  description: 'First e2e map uniquealphadesc',
  expectedEntries: [
    'MapOne/MapOne_Easy.rlrr',
    'MapOne/album.jpg',
    'MapOne/song.ogg',
    'MapOne/drums.ogg',
  ],
};

export const MAP_TWO: MapFixture = {
  zipPath: path.join(fixturesDir, 'E2E_Map_Two.zip'),
  title: 'E2E Map Two Beta',
  artist: 'Crimson Tide',
  mapper: 'MapperBeta',
  description: 'Second e2e map uniquebetadesc',
  expectedEntries: [
    'MapTwo/MapTwo_Hard.rlrr',
    'MapTwo/album.jpg',
    'MapTwo/song.ogg',
    'MapTwo/drums.ogg',
  ],
};
