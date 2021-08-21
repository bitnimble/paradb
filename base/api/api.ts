import { Buffer } from 'buffer';
import { serializationDeps } from 'pages/paradb/base/helpers';
import {
  deserializeFindMapsResponse,
  deserializeGetMapResponse,
  deserializeGetUserResponse,
  deserializeLoginResponse,
  deserializeSignupResponse,
  deserializeSubmitMapResponse,
  FindMapsResponse,
  GetMapRequest,
  GetMapResponse,
  LoginRequest,
  LoginResponse,
  serializeLoginRequest,
  serializeSignupRequest,
  serializeSubmitMapRequest,
  SignupRequest,
  SignupResponse,
  SubmitMapRequest,
  SubmitMapResponse,
  User,
} from 'paradb-api-schema';

export interface Api {
  /* Auth */
  login(req: LoginRequest): Promise<LoginResponse>;
  signup(req: SignupRequest): Promise<SignupResponse>;

  /* User */
  getMe(): Promise<User>;

  /* Maps */
  findMaps(): Promise<FindMapsResponse>;
  getMap(req: GetMapRequest): Promise<GetMapResponse>;
  submitMap(
      req: SubmitMapRequest,
      onProgress: (e: ProgressEvent) => void,
  ): Promise<SubmitMapResponse>;
}

export class HttpApi implements Api {
  private apiBase = '/api';

  async login(req: LoginRequest): Promise<LoginResponse> {
    const bsonReq = serializeLoginRequest(serializationDeps, req);
    const resp = await post(path(this.apiBase, 'users', 'login'), bsonReq);
    return deserializeLoginResponse(serializationDeps, resp);
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const bsonReq = serializeSignupRequest(serializationDeps, req);
    const resp = await post(path(this.apiBase, 'users', 'signup'), bsonReq);
    return deserializeSignupResponse(serializationDeps, resp);
  }

  async getMe(): Promise<User> {
    const bsonResp = await get(path(this.apiBase, 'users', 'me'));
    const resp = deserializeGetUserResponse(serializationDeps, bsonResp);
    if (!resp.success) {
      throw new Error();
    }
    return resp.user;
  }

  async findMaps(): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'));
    return deserializeFindMapsResponse(serializationDeps, resp);
  }

  async getMap(req: GetMapRequest): Promise<GetMapResponse> {
    const resp = await get(path(this.apiBase, 'maps', req.id));
    return deserializeGetMapResponse(serializationDeps, resp);
  }

  async submitMap(
      req: SubmitMapRequest,
      onProgress: (e: ProgressEvent) => void,
  ): Promise<SubmitMapResponse> {
    return new Promise((res) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', path(this.apiBase, 'maps', 'submit'), true);
      xhr.setRequestHeader('Content-Type', 'application/bson');
      xhr.upload.onprogress = onProgress;
      xhr.send(serializeSubmitMapRequest(serializationDeps, req));
      xhr.onload = () => {
        res(deserializeSubmitMapResponse(serializationDeps, xhr.response));
      };
    });
  }
}

function path(...parts: string[]) {
  return [
    ...parts.slice(0, parts.length - 1).map((part, i) => part.endsWith('/') ? part : `${part}/`),
    parts[parts.length - 1],
  ].join('');
}

async function get(path: string): Promise<Buffer> {
  const resp = await fetch(path);
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf);
}
async function post(path: string, body: Buffer): Promise<Buffer> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      ['Content-Type']: 'application/bson',
    },
    body,
  });
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf);
}
