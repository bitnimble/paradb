import { makeAutoObservable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'paradb-api-schema';

export class MapPageStore {
  map?: PDMap;

  constructor() {
    makeAutoObservable(this);
  }
}

export class MapPagePresenter {
  constructor(private readonly api: Api, private readonly store: MapPageStore) {}

  async getMap(id: string) {
    const resp = await this.api.getMap({ id });
    if (!resp.success) {
      throw new Error();
    }
    runInAction(() => this.store.map = resp.map);
  }
}
