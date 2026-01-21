import { Api } from 'app/api/api';
import { observable, runInAction } from 'mobx';
import React from 'react';
import { PDMap } from 'schema/maps';
import { RoutePath, routeFor } from 'utils/routes';

export class MapPageStore {
  @observable accessor ReuploadDialog: React.ComponentType | undefined = undefined;
  @observable accessor map: PDMap;

  constructor(map: PDMap) {
    this.map = map;
  }
}

export class MapPagePresenter {
  constructor(
    private readonly api: Api,
    private readonly store: MapPageStore
  ) {}

  async getMap(id: string) {
    const resp = await this.api.getMap(id);
    if (!resp.success) {
      throw new Error('Could not retrieve map');
    }
    runInAction(() => (this.store.map = resp.map));
  }

  async deleteMap() {
    if (!this.store.map) {
      return;
    }
    const mapName = this.store.map.title;
    if (!confirm(`Are you sure you want to delete the map '${mapName}'?`)) {
      return;
    }
    const resp = await this.api.deleteMap(this.store.map.id);
    if (!resp.success) {
      throw new Error('Could not delete map');
    }

    // Don't use next routing, in order to force a full load
    window.location.href = routeFor([RoutePath.MAP_LIST]);
  }

  async toggleFavorite() {
    if (!this.store.map || !this.store.map.userProjection) {
      return;
    }
    const newVal = !this.store.map.userProjection.isFavorited;
    const resp = await this.api.setFavorites({ mapIds: [this.store.map.id], isFavorite: newVal });
    if (resp.success) {
      runInAction(() => (this.store.map.userProjection = { isFavorited: newVal }));
    }
  }
}
