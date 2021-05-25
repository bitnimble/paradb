import { observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'pages/paradb/map/map_schema';

export class MapListStore {
  @observable.shallow
  maps?: PDMap[];
}

export class MapListPresenter {
  constructor(private readonly api: Api, private readonly store: MapListStore) {
  }

  async findMaps() {
    const { maps } = await this.api.findMaps();
    runInAction(() => this.store.maps = maps);
  }
}
