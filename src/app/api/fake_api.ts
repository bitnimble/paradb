import { ApiResponse } from 'schema/api';
import {
  FindMapsResponse,
  SearchMapsRequest,
  GetMapResponse,
  DeleteMapResponse,
  SubmitMapResponse,
  PDMap,
} from 'schema/maps';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  SetFavoriteMapsRequest,
  SignupRequest,
  SignupResponse,
  User,
} from 'schema/users';
import { Api } from './api';
import { createClient } from 'services/session/supabase_client';

const DELAY = 500;

async function delay(ms: number = DELAY) {
  return new Promise<void>((res) => {
    setTimeout(() => res(), ms);
  });
}

export class FakeApi implements Api {
  readonly supabase = createClient();

  async changePassword(_req: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return { success: true };
  }
  async login(_req: LoginRequest): Promise<LoginResponse> {
    return { success: true, accessToken: '123', refreshToken: '456' };
  }
  async setFavorites(_req: SetFavoriteMapsRequest): Promise<ApiResponse> {
    return { success: true };
  }

  async signup(_req: SignupRequest): Promise<SignupResponse> {
    return { success: true, id: 'U123456' };
  }

  async getSession(): Promise<User> {
    return { id: '0', username: 'alice', email: 'alice@test.com' };
  }

  async getMe(): Promise<User> {
    return { id: '0', username: 'alice', email: 'alice@test.com' };
  }

  async findMaps(): Promise<FindMapsResponse> {
    await delay();
    return { success: true, maps: fakeMaps };
  }
  async searchMaps(_req: SearchMapsRequest): Promise<FindMapsResponse> {
    await delay();
    return { success: true, maps: fakeMaps };
  }
  async getMap(id: string): Promise<GetMapResponse> {
    await delay(1000);
    const map = fakeMaps.find((m) => m.id === id);
    if (map) {
      return { success: true, map };
    }
    // TODO: fake http errors
    throw new Error(`Could not find map with ID ${id}`);
  }
  async deleteMap(id: string): Promise<DeleteMapResponse> {
    await delay(1000);
    const index = fakeMaps.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, errorMessage: 'Missing map', statusCode: 404 };
    }
    fakeMaps.splice(index, 1);
    return { success: true };
  }

  async submitMap(_req: { id?: string; mapData: Uint8Array }): Promise<SubmitMapResponse> {
    await delay();
    return { success: true, id: allStar.id };
  }
}

const allStar: PDMap = {
  id: '1',
  visibility: 'P',
  validity: 'valid',
  submissionDate: '2021-06-01T00:00:00',
  title: 'All Star',
  artist: 'Smash Mouth',
  author: 'Nobody',
  uploader: '0',
  albumArt: 'https://upload.wikimedia.org/wikipedia/en/1/16/All_star.jpg',
  complexity: 1,
  favorites: 3,
  downloadCount: 5,
  difficulties: [
    { difficulty: 1, difficultyName: undefined },
    { difficulty: 2, difficultyName: undefined },
    { difficulty: 3, difficultyName: undefined },
    { difficulty: 5, difficultyName: undefined },
  ],
  userProjection: undefined,
  description: 'Test description',
};

const californication: PDMap = {
  id: '2',
  visibility: 'P',
  validity: 'valid',
  submissionDate: '2021-06-01T00:00:00',
  title: 'Californication',
  artist: 'Red Hot Chili Peppers',
  author: 'Nobody',
  uploader: '0',
  albumArt: 'https://upload.wikimedia.org/wikipedia/en/d/df/RedHotChiliPeppersCalifornication.jpg',
  complexity: 2,
  favorites: 10,
  downloadCount: 7,
  difficulties: [
    { difficulty: 1, difficultyName: "anon's Easy" },
    { difficulty: 2, difficultyName: 'Medium' },
    { difficulty: 3, difficultyName: 'West Coast' },
    { difficulty: 5, difficultyName: 'Sacramento' },
  ],
  userProjection: undefined,
  description: 'Test description',
};

const fakeMaps = [allStar, californication];
