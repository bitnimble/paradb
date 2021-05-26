import { PDMap } from 'pages/paradb/map/map_schema';
import { Api, FindMapsResponse, GetMapRequest, GetMapResponse } from './api';

const DELAY = 500;

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
    await delay(1000);
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
  uploader: 'Nobody',
  albumArt: 'https://upload.wikimedia.org/wikipedia/en/1/16/All_star.jpg',
  complexities: [
    { complexity: 1 },
    { complexity: 2 },
    { complexity: 3 },
    { complexity: 5 },
  ],
  description: 'Test description',
  downloadLink: 'www.google.com',
};

const californication: PDMap = {
  id: '2',
  title: 'Californication',
  artist: 'Red Hot Chili Peppers',
  author: 'Nobody',
  uploader: 'Nobody',
  albumArt: 'https://upload.wikimedia.org/wikipedia/en/d/df/RedHotChiliPeppersCalifornication.jpg',
  complexities: [
    { complexity: 1, complexityName: 'anon\'s Easy' },
    { complexity: 2, complexityName: 'Medium' },
    { complexity: 3, complexityName: 'West Coast' },
    { complexity: 5, complexityName: 'Sacramento' },
  ],
  description: 'Test description',
  downloadLink: 'drive.google.com',
};

const fakeMaps = [allStar, californication];
