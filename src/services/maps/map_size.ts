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
  if (!(seconds != null && seconds > 0 && Number.isFinite(seconds))) {
    return UNKNOWN_LENGTH_ALLOWANCE;
  }
  return Math.min(MAX_MAP_FILE_SIZE, BASE_ALLOWANCE + (seconds / 60) * ALLOWANCE_PER_MINUTE);
}

/** Longest of the lengths the difficulties declare; they drift when recorded separately. */
export function longestSongLength(lengths: (number | undefined)[]): number | undefined {
  const declared = lengths.filter((l): l is number => l != null);
  return declared.length === 0 ? undefined : Math.max(...declared);
}

export function overBudgetMessage(bytes: number, limit: number): string {
  // Round the two in opposite directions, so a file just over its limit can't report both as the
  // same number.
  return `File is ${formatFileSize(bytes, Math.ceil)}, over the ${formatFileSize(limit, Math.floor)} limit for a song of this length`;
}

export function formatFileSize(bytes: number, round: (n: number) => number = Math.round): string {
  // Labelled MB but computed as MiB: matches what Windows Explorer shows users.
  return `${round(bytes / MIB)}MB`;
}
