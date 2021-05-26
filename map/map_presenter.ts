import { observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'pages/paradb/map/map_schema';

export class MapPageStore {
  @observable.ref
  map?: PDMap;
}

export class MapPagePresenter {
  constructor(private readonly api: Api, private readonly store: MapPageStore) { }

  async getMap(id: string) {
    const { map } = await this.api.getMap({ id });
    runInAction(() => this.store.map = map);
  }
}
