import { makeAutoObservable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';
import { PDMap } from 'paradb-api-schema';

export class MapPageStore {
  map?: PDMap;

  constructor() {
    makeAutoObservable(this);
  }
}

export class MapPagePresenter {
  constructor(
      private readonly api: Api,
      private readonly navigate: Navigate,
      private readonly store: MapPageStore,
  ) {}

  async getMap(id: string) {
    const resp = await this.api.getMap(id);
    if (!resp.success) {
      throw new Error('Could not retrieve map');
    }
    runInAction(() => this.store.map = resp.map);
  }

  async deleteMap(id: string) {
    if (!this.store.map) {
      return;
    }
    const mapName = this.store.map.title;
    if (!confirm(`Are you sure you want to delete the map '${mapName}'?`)) {
      return;
    }
    const resp = await this.api.deleteMap(id);
    if (!resp.success) {
      throw new Error('Could not delete map');
    }

    this.navigate([RoutePath.MAP_LIST], true);
  }
}
