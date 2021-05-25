import { PDMap } from 'pages/paradb/map/map_schema';
import { Api, FindMapsResponse, GetMapRequest, GetMapResponse } from './api';

const DELAY = 200;

async function delay(ms: number = DELAY) {
  return new Promise<void>(res => {
    setTimeout(() => res(), ms);
  });
};

export class FakeApi implements Api {
  async findMaps(): Promise<FindMapsResponse> {
    await delay();
    return {
      maps: fakeMaps,
    };
  }
  async getMap(req: GetMapRequest): Promise<GetMapResponse> {
    await delay();
    const map = fakeMaps.find(m => m.id === req.id);
    if (map) {
      return { map };
    }
    // TODO: fake http errors
    throw new Error(`Could not find map with ID ${req.id}`);
  }
}


const allStar: PDMap = {
  id: '1',
  title: 'All Star',
  artist: 'Smash Mouth',
  author: 'Nobody',
  albumArt: undefined,
  complexity: [
    { difficulty: 1, difficultyName: 'Easy' },
    { difficulty: 2, difficultyName: 'Medium' },
    { difficulty: 3, difficultyName: 'Hard' },
    { difficulty: 5, difficultyName: 'Extreme' },
  ],
  description: 'Test description',
  blobUrl: '',
};

const californication: PDMap = {
  id: '2',
  title: 'Californication',
  artist: 'Red Hot Chili Peppers',
  author: 'Nobody',
  albumArt: undefined,
  complexity: [
    { difficulty: 1, difficultyName: 'Easy' },
    { difficulty: 2, difficultyName: 'Medium' },
    { difficulty: 3, difficultyName: 'Hard' },
    { difficulty: 5, difficultyName: 'Extreme' },
  ],
  description: 'Test description',
  blobUrl: '',
};

const fakeMaps = [allStar, californication];
