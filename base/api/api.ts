import { PDMap } from 'pages/paradb/map/map_schema';

// TODO: use shared schema (e.g. a common .d.ts) to keep client and server in sync
export type FindMapsResponse = {
  maps: PDMap[];
}

export type GetMapRequest = {
  id: string;
}
export type GetMapResponse = {
  map: PDMap;
}

export interface Api {
  findMaps(): Promise<FindMapsResponse>;
  getMap(req: GetMapRequest): Promise<GetMapResponse>;
}

export class HttpApi implements Api {
  async findMaps(): Promise<FindMapsResponse> {
    throw new Error('Method not implemented.');
  }
  async getMap(req: GetMapRequest): Promise<GetMapResponse> {
    throw new Error('Method not implemented.');
  }
}
