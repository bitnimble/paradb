import { observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'paradb-api-schema';

export class MapListStore {
  @observable.shallow
  maps?: PDMap[];
}

export class MapListPresenter {
  constructor(private readonly api: Api, private readonly store: MapListStore) {
  }

  async findMaps() {
    const resp = await this.api.findMaps();
    if (!resp.success) {
      throw new Error();
    }
    runInAction(() => this.store.maps = resp.maps);
  }
}
