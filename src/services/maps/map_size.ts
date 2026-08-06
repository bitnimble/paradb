const MIB = 1024 * 1024;

/** Ceiling regardless of song length. */
export const MAX_MAP_FILE_SIZE = 500 * MIB;

// Rates are for the song+drums pair: FLAC ~13MiB/min, 256kbps Opus ~3.7MiB/min. The base fits FLAC
// for a standard-length song, and the per-minute rate is well under it, so past ~8 minutes a map has
// to be lossy.
const BASE_ALLOWANCE = 80 * MIB;
const ALLOWANCE_PER_MINUTE = 3 * MIB;
// `length` is optional in the rlrr schema, so a map that predates it can't be sized. Falling back to
// the old flat limit keeps those uploadable without making an absent length the most generous
// budget going - which would just be an incentive to drop the field.
const UNKNOWN_LENGTH_ALLOWANCE = 100 * MIB;

export function maxMapFileSize(seconds: number | undefined): number {
  if (seconds == null || seconds <= 0 || !Number.isFinite(seconds)) {
    return UNKNOWN_LENGTH_ALLOWANCE;
  }
  return Math.min(MAX_MAP_FILE_SIZE, BASE_ALLOWANCE + (seconds / 60) * ALLOWANCE_PER_MINUTE);
}

/** Longest of the lengths the difficulties declare; they drift when recorded separately. */
export function longestSongLength(lengths: (number | undefined)[]): number | undefined {
  const declared = lengths.filter((l): l is number => l != null);
  return declared.length === 0 ? undefined : Math.max(...declared);
}

export function overBudgetMessage(limit: number): string {
  return `File is over the ${formatMaxFileSize(limit)} limit for a song of this length`;
}

/**
 * A limit, as a size the user can compare their file against. Always rounds down, so a file the
 * size it names is never over the limit it names.
 */
export function formatMaxFileSize(bytes: number): string {
  // Labelled MB but computed as MiB: matches what Windows Explorer shows users.
  const mib = bytes / MIB;
  // A whole megabyte is a big share of a small limit, so keep a decimal until the limits get big
  // enough for it to be noise.
  const rounded = mib < 50 ? Math.floor(mib * 10) / 10 : Math.floor(mib);
  return `${rounded}MB`;
}
