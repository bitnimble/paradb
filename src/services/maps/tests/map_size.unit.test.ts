import {
  MAX_MAP_FILE_SIZE,
  formatFileSize,
  longestSongLength,
  maxMapFileSize,
  overBudgetMessage,
} from 'services/maps/map_size';

const MIB = 1024 * 1024;

describe('maxMapFileSize', () => {
  it('scales with song length', () => {
    expect(maxMapFileSize(600)).toBeGreaterThan(maxMapFileSize(60));
  });

  it('fits lossless audio for a standard-length song', () => {
    expect(maxMapFileSize(5 * 60)).toEqual(95 * MIB);
  });

  it('only fits lossy audio for an hour-long song', () => {
    expect(maxMapFileSize(60 * 60)).toEqual(260 * MIB);
  });

  it('never exceeds the hard cap', () => {
    expect(maxMapFileSize(60 * 60 * 24)).toEqual(MAX_MAP_FILE_SIZE);
  });

  // An unreadable length mustn't be the most generous budget on offer, or dropping the field would
  // be the way to get one.
  it('falls back to a fixed allowance, not the cap, when the length is unusable', () => {
    for (const unusable of [undefined, 0, -1, NaN, Infinity]) {
      expect(maxMapFileSize(unusable)).toEqual(100 * MIB);
    }
    expect(maxMapFileSize(undefined)).toBeLessThan(MAX_MAP_FILE_SIZE);
  });
});

describe('longestSongLength', () => {
  it('takes the longest declared length', () => {
    expect(longestSongLength([213.5, undefined, 214.25])).toEqual(214.25);
  });

  it('is undefined when nothing declares one', () => {
    expect(longestSongLength([])).toBeUndefined();
    expect(longestSongLength([undefined, undefined])).toBeUndefined();
  });
});

describe('formatFileSize', () => {
  it('reports MiB, which is what the user sees in their file browser', () => {
    expect(formatFileSize(100 * MIB)).toEqual('100MB');
    expect(formatFileSize(1.6 * MIB)).toEqual('2MB');
  });
});

describe('overBudgetMessage', () => {
  // Rounding both to nearest would report a file 0.2MiB over its limit as the same size as it.
  it('never reports the file and the limit as the same size', () => {
    const limit = maxMapFileSize(5 * 60);

    const message = overBudgetMessage(limit + 0.2 * MIB, limit);

    expect(message).toEqual('File is 96MB, over the 95MB limit for a song of this length');
  });
});
