import {
  MAX_MAP_FILE_SIZE,
  formatMaxFileSize,
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

describe('formatMaxFileSize', () => {
  it('reports MiB, which is what the user sees in their file browser', () => {
    expect(formatMaxFileSize(100 * MIB)).toEqual('100MB');
  });

  // Naming a limit larger than it is would tell the user a file that gets rejected should fit.
  it('never names a size larger than the limit it was given', () => {
    for (const mib of [0.05, 1.99, 49.99, 50.5, 95.9, 260.75]) {
      expect(parseFloat(formatMaxFileSize(mib * MIB))).toBeLessThanOrEqual(mib);
    }
  });

  it('keeps a decimal below 50MB, where a whole megabyte is a big share of the limit', () => {
    expect(formatMaxFileSize(1.66 * MIB)).toEqual('1.6MB');
    expect(formatMaxFileSize(49.99 * MIB)).toEqual('49.9MB');
    expect(formatMaxFileSize(40 * MIB)).toEqual('40MB');
  });

  it('drops to whole megabytes above that, where the decimal is noise', () => {
    expect(formatMaxFileSize(50.5 * MIB)).toEqual('50MB');
    expect(formatMaxFileSize(260.75 * MIB)).toEqual('260MB');
  });
});

describe('overBudgetMessage', () => {
  it('names the limit', () => {
    expect(overBudgetMessage(maxMapFileSize(5 * 60))).toEqual(
      'File is over the 95MB limit for a song of this length'
    );
  });
});
