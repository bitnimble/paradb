import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { MapList } from 'pages/paradb/map_list/map_list';
import { MapListPresenter, MapListStore } from 'pages/paradb/map_list/map_list_presenter';
import React from 'react';

export function createMapList(api: Api) {
  const store = new MapListStore();
  const presenter = new MapListPresenter(api, store);
  const onMount = () => presenter.findMaps();

  return observer(() => (
    <MapList
        maps={store.maps}
        onMount={onMount}
    />
  ))
}
