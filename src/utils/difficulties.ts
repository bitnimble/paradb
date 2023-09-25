export const difficultyColors: Record<KnownDifficulty, string> = {
  'easy': 'green',
  'medium': 'gold',
  'hard': 'orange',
  'expert': 'red',
  'expert+': 'black',
};

export const difficultyMap = { 'easy': 1, 'medium': 2, 'hard': 3, 'expert': 4, 'expert+': 5 };
const difficultyRegexKeys = [...Object.keys(difficultyMap)]
  .reverse() // Reverse it so that 'expert+' as at the start, as the regex is greedy and we don't want 'expert+' to be matched as 'expert'
  .map((s) => s.replace('+', '\\+'))
  .join('|');
export const difficultyRegex = new RegExp(`(${difficultyRegexKeys})`, 'gi');

export type KnownDifficulty = keyof typeof difficultyMap;
// Best effort sorting of freeform difficulty names
export const parseDifficulty = (s?: string) =>
  (s?.match(difficultyRegex) || ['medium'])[0].toLowerCase() as KnownDifficulty;
