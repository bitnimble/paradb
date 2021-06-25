import {
  deserializeMap,
  LoginRequest,
  LoginResponse,
  PDMap,
  SignupRequest,
  SignupResponse,
} from 'paradb-api-schema';

// TODO: share type definition with backend
export type User = {
  username: string,
};

// TODO: use shared schema (e.g. a common .d.ts) to keep client and server in sync
export type FindMapsResponse = {
  maps: PDMap[];
};
export type GetMapRequest = {
  id: string;
};
export type GetMapResponse = {
  map: PDMap;
};

export interface Api {
  /* Auth */
  login(req: LoginRequest): Promise<LoginResponse>;
  signup(req: SignupRequest): Promise<SignupResponse>;

  /* User */
  getMe(): Promise<User>;

  /* Maps */
  findMaps(): Promise<FindMapsResponse>;
  getMap(req: GetMapRequest): Promise<GetMapResponse>;
}

export class HttpApi implements Api {
  private apiBase = '/api'

  async login(req: LoginRequest): Promise<LoginResponse> {
    const resp = await post(path(this.apiBase, 'users', 'login'), req);
    return resp;
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const resp = await post(path(this.apiBase, 'users', 'signup'), req);
    // TODO: deserialize responses using schema deserializer
    return resp;
  }

  async getMe(): Promise<User> {
    const resp = await get(path(this.apiBase, 'users', 'me'));
    if (!resp.success) {
      throw new Error();
    }
    return resp.user;
  }

  async findMaps(): Promise<FindMapsResponse> {
    const resp = await get(path(this.apiBase, 'maps'));
    if (!resp) {
      throw new Error('unexpected null response');
    }
    if (!Array.isArray(resp.maps)) {
      throw new Error('expected array for findMaps');
    }
    return { maps: resp.maps.map((m: any) => deserializeMap(m)) };
  }

  async getMap(req: GetMapRequest): Promise<GetMapResponse> {
    const resp = await get(path(this.apiBase, `maps/${req.id}`));
    return { map: deserializeMap(resp.map) };
  }
}

function path(...parts: string[]) {
  return [
    ...parts.slice(0, parts.length - 1).map((part, i) => part.endsWith('/') ? part : `${part}/`),
    parts[parts.length - 1]
  ].join('');
}

const xssiPrefix = '\'"])}while(1);</x>//';
async function get(path: string): Promise<any> {
  const resp = await fetch(path);
  const text = await resp.text();
  return JSON.parse(text.substr(xssiPrefix.length));
}
async function post(path: string, body: object): Promise<any> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      ['Content-Type']: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  return JSON.parse(text.substr(xssiPrefix.length));
}
