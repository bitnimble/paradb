import * as qs from 'qs';
import { ApiResponse, apiResponse } from 'schema/api';
import {
  DeleteMapResponse,
  FindMapsResponse,
  GetMapResponse,
  SearchMapsRequest,
  SubmitMapRequest,
  SubmitMapResponse,
  deserializeDeleteMapResponse,
  deserializeFindMapsResponse,
  deserializeGetMapResponse,
  deserializeSubmitMapResponse,
  serializeSubmitMapRequest,
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
  deserializeChangePasswordResponse,
  deserializeGetUserResponse,
  deserializeLoginResponse,
  deserializeSignupResponse,
  serializeChangePasswordRequest,
  serializeLoginRequest,
  serializeSetFavoriteMapsRequest,
  serializeSignupRequest,
} from 'schema/users';

export interface Api {
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
  submitMap(
    req: SubmitMapRequest,
    onProgress: (e: ProgressEvent) => void,
    onUploadFinish: () => void
  ): Promise<SubmitMapResponse>;
}

export class HttpApi implements Api {
  private apiBase = '/api';

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

  async submitMap(
    req: SubmitMapRequest,
    onProgress: (e: ProgressEvent) => void,
    onUploadFinish: () => void
  ): Promise<SubmitMapResponse> {
    return new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', path(this.apiBase, 'maps', 'submit'), true);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.responseType = 'arraybuffer';
      xhr.upload.addEventListener('progress', onProgress);
      xhr.upload.addEventListener('load', onUploadFinish);
      xhr.onload = () => {
        const resp = new Uint8Array(xhr.response);
        res(deserializeSubmitMapResponse(resp));
      };
      xhr.onerror = () => {
        rej();
      };
      const serialized = serializeSubmitMapRequest(req);
      xhr.send(serialized);
    });
  }
}

function path(...parts: string[]) {
  return [
    ...parts.slice(0, parts.length - 1).map((part, i) => (part.endsWith('/') ? part : `${part}/`)),
    parts[parts.length - 1],
  ].join('');
}

async function get(path: string, queryParams?: string): Promise<Uint8Array> {
  const search = queryParams ? `?${queryParams}` : '';
  const resp = await fetch(path + search);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}
async function post(path: string, body?: Uint8Array): Promise<Uint8Array> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { ['Content-Type']: contentType },
    body,
  });
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

// Set MIME type for requests and responses to 'application/x-protobuf' to allow Cloudflare to use
// brotli / gzip encoding over the wire. We don't actually use protobuf but Cloudflare doesn't let
// you force compression for 'application/octet-stream', so this is the closest.
const contentType = 'application/x-protobuf';
