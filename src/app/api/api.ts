import { SupabaseClient } from '@supabase/supabase-js';
import * as qs from 'qs';
import { ApiResponse, apiResponse } from 'schema/api';
import {
  DeleteMapResponse,
  FindMapsResponse,
  GetMapResponse,
  SearchMapsRequest,
  SubmitMapResponse,
  deserializeDeleteMapResponse,
  deserializeFindMapsResponse,
  deserializeGetMapResponse,
  deserializeSubmitMapResponse,
} from 'schema/maps';
import { SubmitMapRequest } from 'schema/maps_zod';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  SetFavoriteMapsRequest,
  SignupRequest,
  SignupResponse,
  User,
  deserializeChangePasswordResponse,
  deserializeGetUserResponse,
  deserializeLoginResponse,
  deserializeSignupResponse,
  serializeChangePasswordRequest,
  serializeLoginRequest,
  serializeSetFavoriteMapsRequest,
  serializeSignupRequest,
} from 'schema/users';
import { createClient } from 'services/session/supabase_client';

export interface Api {
  readonly supabase: SupabaseClient;

  /* Auth */
  login(req: LoginRequest): Promise<LoginResponse>;
  signup(req: SignupRequest): Promise<SignupResponse>;

  /* User */
  // Same as getMe(), but will not report errors to sentry if unauthorized. This is only
  // intended to be used as a logged-in session check.
  getSession(): Promise<User>;
  getMe(): Promise<User>;
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
  readonly supabase = createClient();

  async login(req: LoginRequest): Promise<LoginResponse> {
    const bsonReq = serializeLoginRequest(req);
    const resp = await post(path(this.apiBase, 'users', 'login'), bsonReq);
    return deserializeLoginResponse(resp);
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const bsonReq = serializeSignupRequest(req);
    const resp = await post(path(this.apiBase, 'users', 'signup'), bsonReq);
    return deserializeSignupResponse(resp);
  }

  async getSession(): Promise<User> {
    const bsonResp = await get(path(this.apiBase, 'users', 'session'));
    const resp = deserializeGetUserResponse(bsonResp);
    if (!resp.success) {
      throw new Error();
    }
    return resp.user;
  }

  async getMe(): Promise<User> {
    const bsonResp = await get(path(this.apiBase, 'users', 'me'));
    const resp = deserializeGetUserResponse(bsonResp);
    if (!resp.success) {
      throw new Error();
    }
    return resp.user;
  }

  async changePassword(req: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const bsonReq = serializeChangePasswordRequest(req);
    const bsonResp = await post(path(this.apiBase, 'users', 'changePassword'), bsonReq);
    return deserializeChangePasswordResponse(bsonResp);
  }

  async setFavorites(req: SetFavoriteMapsRequest): Promise<ApiResponse> {
    const bsonReq = serializeSetFavoriteMapsRequest(req);
    const bsonResp = await post(path(this.apiBase, 'favorites'), bsonReq);
    return apiResponse.deserialize(bsonResp);
  }

  async findMaps(): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'));
    return deserializeFindMapsResponse(resp);
  }

  async searchMaps(req: {
    query: string;
    offset: number;
    limit: number;
  }): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'), qs.stringify(req));
    return deserializeFindMapsResponse(resp);
  }

  async getMap(id: string): Promise<GetMapResponse> {
    const resp = await get(path(this.apiBase, 'maps', id));
    return deserializeGetMapResponse(resp);
  }

  async deleteMap(id: string): Promise<DeleteMapResponse> {
    const resp = await post(path(this.apiBase, 'maps', id, 'delete'));
    return deserializeDeleteMapResponse(resp);
  }

  async submitMap(req: SubmitMapRequest): Promise<SubmitMapResponse> {
    const resp = await post(path(this.apiBase, 'maps', 'submit'), JSON.stringify(req));
    return deserializeSubmitMapResponse(resp);
  }
}

function path(...parts: string[]) {
  return [
    ...parts.slice(0, parts.length - 1).map((part) => (part.endsWith('/') ? part : `${part}/`)),
    parts[parts.length - 1],
  ].join('');
}

async function get(path: string, queryParams?: string): Promise<string> {
  const search = queryParams ? `?${queryParams}` : '';
  const resp = await fetch(path + search);
  return resp.text();
}
async function post(path: string, body?: string): Promise<string> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { ['Content-Type']: contentType },
    body,
  });
  return resp.text();
}

const contentType = 'application/json';
