export type Complexity = {
  complexity: number;
  complexityName: string | undefined;
}

export type PDMap = {
  id: string;
  title: string;
  artist: string;
  author: string;
  uploader: string;
  albumArt: string | undefined;
  complexities: Complexity[];
  description: string | undefined;
  downloadLink: string;
}

function validateComplexity(input: any): Complexity {
  return {
    complexity: validateNumber(input.complexity),
    complexityName: validateOptional(validateString, input.complexityName),
  };
}

function validateNumber(n: any): number {
  if (typeof n !== 'number') {
    throw new Error(`Expected ${JSON.stringify(n)} to be a number`);
  }
  return n;
}

function validateString(s: any): string {
  if (typeof s !== 'string') {
    throw new Error(`Expected ${JSON.stringify(s)} to be a string`);
  }
  return s;
}

function validateOptional<T>(t: (i: any) => T, input: any): T | undefined {
  if (input == null) {
    return undefined;
  }
  return t(input);
}

function validateArray<T>(t: (i: any) => T, input: any): T[] {
  if (!Array.isArray(input)) {
    throw new Error(`Expected ${JSON.stringify(input)} to be an array`);
  }
  return input.map(i => t(i));
}

export function validatePDMap(input: any): PDMap {
  return {
    id: validateString(input.id),
    title: validateString(input.title),
    artist: validateString(input.artist),
    author: validateString(input.author),
    uploader: validateString(input.uploader),
    albumArt: validateOptional(validateString, input.albumArt),
    complexities: validateArray(validateComplexity, input.complexities),
    description: validateOptional(validateString, input.description),
    downloadLink: validateString(input.downloadLink),
  };
}
