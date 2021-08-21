import * as bson from 'bson';
import { Buffer } from 'buffer';
import { useEffect } from 'react';

export const useComponentDidMount = (f: () => void) => useEffect(f, []);

export const serializationDeps = {
  bson,
  buffer: Buffer,
};
