export function parseRlrr(bytes: Uint8Array): unknown {
  // Paradiddle writes some rlrr files as UTF-16LE with a byte order mark. Both decoders strip the
  // mark themselves; leaving one in front would fail the parse.
  const isUtf16le = bytes[0] === 0xff && bytes[1] === 0xfe;
  return JSON.parse(new TextDecoder(isUtf16le ? 'utf-16le' : 'utf-8').decode(bytes));
}

/** Song length in seconds, as declared by an rlrr's metadata. */
export function rlrrSongLength(rlrr: unknown): number | undefined {
  const length = (rlrr as { recordingMetadata?: { length?: unknown } })?.recordingMetadata?.length;
  return typeof length === 'number' ? length : undefined;
}
