import { useEffect } from 'react';

export const useComponentDidMount = (f: () => void) => useEffect(f, []);
