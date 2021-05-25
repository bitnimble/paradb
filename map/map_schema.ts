export type Complexity = {
  difficulty: number;
  difficultyName: string;
}

export type PDMap = {
  id: string;
  title: string;
  artist: string;
  author: string;
  albumArt?: string;
  complexity: Complexity[];
  description: string;
  blobUrl: string;
}
