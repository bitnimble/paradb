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
    const bsonReq = serializeLoginRequest(req);
    const resp = await post(path(this.apiBase, 'users', 'login'), bsonReq);
    return deserializeLoginResponse(resp);
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const bsonReq = serializeSignupRequest(req);
    const resp = await post(path(this.apiBase, 'users', 'signup'), bsonReq);
    return deserializeSignupResponse(resp);
  }

  async getMe(): Promise<User> {
    const bsonResp = await get(path(this.apiBase, 'users', 'me'));
    const resp = deserializeGetUserResponse(bsonResp);
    if (!resp.success) {
      throw new Error();
    }
    return resp.user;
  }

  async findMaps(): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'));
    return deserializeFindMapsResponse(resp);
  }

  async getMap(req: GetMapRequest): Promise<GetMapResponse> {
    const resp = await get(path(this.apiBase, 'maps', req.id));
    return deserializeGetMapResponse(resp);
  }

  async submitMap(
      req: SubmitMapRequest,
      onProgress: (e: ProgressEvent) => void,
  ): Promise<SubmitMapResponse> {
    return new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', path(this.apiBase, 'maps', 'submit'), true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.responseType = 'arraybuffer';
      xhr.upload.addEventListener('progress', onProgress);
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
    ...parts.slice(0, parts.length - 1).map((part, i) => part.endsWith('/') ? part : `${part}/`),
    parts[parts.length - 1],
  ].join('');
}

async function get(path: string): Promise<Uint8Array> {
  const resp = await fetch(path);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}
async function post(path: string, body: Uint8Array): Promise<Uint8Array> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      ['Content-Type']: 'application/octet-stream',
    },
    body,
  });
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}
