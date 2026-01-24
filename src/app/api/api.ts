import * as qs from 'qs';
import { ApiResponse } from 'schema/api';
import {
  DeleteMapResponse,
  FindMapsResponse,
  GetMapResponse,
  SearchMapsRequest,
  SubmitMapRequest,
  SubmitMapResponse,
} from 'schema/maps';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  SetFavoriteMapsRequest,
  SignupRequest,
  SignupResponse,
} from 'schema/users';

export interface Api {
  /* Auth */
  login(req: LoginRequest): Promise<LoginResponse>;
  signup(req: SignupRequest): Promise<SignupResponse>;

  /* User */
  changePassword(req: ChangePasswordRequest): Promise<ChangePasswordResponse>;
  setFavorites(req: SetFavoriteMapsRequest): Promise<ApiResponse>;

  /* Maps */
  findMaps(): Promise<FindMapsResponse>;
  searchMaps(req: SearchMapsRequest): Promise<FindMapsResponse>;
  getMap(id: string): Promise<GetMapResponse>;
  deleteMap(id: string): Promise<DeleteMapResponse>;
  submitMap(req: SubmitMapRequest): Promise<SubmitMapResponse>;
}

export class HttpApi implements Api {
  private apiBase = '/api';

  async login(req: LoginRequest): Promise<LoginResponse> {
    const resp = await post(path(this.apiBase, 'users', 'login'), LoginRequest.parse(req));
    return LoginResponse.parse(resp);
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const resp = await post(path(this.apiBase, 'users', 'signup'), SignupRequest.parse(req));
    return SignupResponse.parse(resp);
  }

  async changePassword(req: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const resp = await post(
      path(this.apiBase, 'users', 'changePassword'),
      ChangePasswordRequest.parse(req)
    );
    return ChangePasswordResponse.parse(resp);
  }

  async setFavorites(req: SetFavoriteMapsRequest): Promise<ApiResponse> {
    const resp = await post(path(this.apiBase, 'favorites'), SetFavoriteMapsRequest.parse(req));
    return ApiResponse.parse(resp);
  }

  async findMaps(): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'));
    return FindMapsResponse.parse(resp);
  }

  async searchMaps(req: {
    query: string;
    offset: number;
    limit: number;
  }): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'), qs.stringify(req));
    return FindMapsResponse.parse(resp);
  }

  async getMap(id: string): Promise<GetMapResponse> {
    const resp = await get(path(this.apiBase, 'maps', id));
    return GetMapResponse.parse(resp);
  }

  async deleteMap(id: string): Promise<DeleteMapResponse> {
    const resp = await post(path(this.apiBase, 'maps', id, 'delete'));
    return DeleteMapResponse.parse(resp);
  }

  async submitMap(req: SubmitMapRequest): Promise<SubmitMapResponse> {
    const resp = await post(path(this.apiBase, 'maps', 'submit'), req);
    return SubmitMapResponse.parse(resp);
  }
}

function path(...parts: string[]) {
  return [
    ...parts.slice(0, parts.length - 1).map((part) => (part.endsWith('/') ? part : `${part}/`)),
    parts[parts.length - 1],
  ].join('');
}

async function get(path: string, queryParams?: string): Promise<unknown> {
  const search = queryParams ? `?${queryParams}` : '';
  const resp = await fetch(path + search);
  return resp.json();
}
async function post(path: string, body?: unknown): Promise<unknown> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { ['Content-Type']: contentType },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return resp.json();
}

const contentType = 'application/json';
