const MIB = 1024 * 1024;

/** Ceiling regardless of song length. */
export const MAX_MAP_FILE_SIZE = 500 * MIB;

// Sized against two tracks (song plus drums). Base fits lossless FLAC (~6.5MiB/min/track) for a
// standard-length song; the per-minute rate is well under that, so FLAC runs out past ~8 minutes
// and medleys and scores have to be lossy (an hour gets 260MiB, vs 220MiB for 256kbps Opus).
const BASE_ALLOWANCE = 80 * MIB;
const ALLOWANCE_PER_MINUTE = 3 * MIB;

/** Falls back to the hard cap when the rlrr doesn't declare a length. */
export function maxMapFileSize(seconds: number | undefined): number {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return MAX_MAP_FILE_SIZE;
  }
  return Math.min(MAX_MAP_FILE_SIZE, BASE_ALLOWANCE + (seconds / 60) * ALLOWANCE_PER_MINUTE);
}

export function formatFileSize(bytes: number): string {
  // Labelled MB but computed as MiB: matches what Windows Explorer shows users.
  return `${Math.round(bytes / MIB)}MB`;
}
