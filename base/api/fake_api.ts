import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  DeleteMapResponse,
  FindMapsResponse,
  GetMapResponse,
  LoginRequest,
  LoginResponse,
  PDMap,
  SignupRequest,
  SignupResponse,
  SubmitMapRequest,
  SubmitMapResponse,
  User,
} from 'paradb-api-schema';
import { Api } from './api';

const DELAY = 500;

async function delay(ms: number = DELAY) {
  return new Promise<void>(res => {
    setTimeout(() => res(), ms);
  });
}

export class FakeApi implements Api {
  async changePassword(req: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return { success: true };
  }
  async login(req: LoginRequest): Promise<LoginResponse> {
    return { success: true };
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    return { success: true };
  }

  async getMe(): Promise<User> {
    return { id: '0', username: 'alice', email: 'alice@test.com' };
  }

  async findMaps(): Promise<FindMapsResponse> {
    await delay();
    return {
      success: true,
      maps: fakeMaps,
    };
  }
  async getMap(id: string): Promise<GetMapResponse> {
    await delay(1000);
    const map = fakeMaps.find(m => m.id === id);
    if (map) {
      return {
        success: true,
        map,
      };
    }
    // TODO: fake http errors
    throw new Error(`Could not find map with ID ${id}`);
  }
  async deleteMap(id: string): Promise<DeleteMapResponse> {
    await delay(1000);
    const index = fakeMaps.findIndex(m => m.id === id);
    if (index === -1) {
      return {
        success: false,
        errorMessage: 'Missing map',
        statusCode: 404,
      };
    }
    fakeMaps.splice(index, 1);
    return { success: true };
  }

  async submitMap(req: SubmitMapRequest): Promise<SubmitMapResponse> {
    await delay();
    return { success: true, id: allStar.id };
  }
}

const allStar: PDMap = {
  id: '1',
  submissionDate: '2021-06-01T00:00:00',
  title: 'All Star',
  artist: 'Smash Mouth',
  author: 'Nobody',
  uploader: 'Nobody',
  albumArt: 'https://upload.wikimedia.org/wikipedia/en/1/16/All_star.jpg',
  complexities: [
    { complexity: 1, complexityName: undefined },
    { complexity: 2, complexityName: undefined },
    { complexity: 3, complexityName: undefined },
    { complexity: 5, complexityName: undefined },
  ],
  description: 'Test description',
};

const californication: PDMap = {
  id: '2',
  submissionDate: '2021-06-01T00:00:00',
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
};

const fakeMaps = [allStar, californication];
