import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { MapPage } from 'pages/paradb/map/map_page';
import { MapPagePresenter, MapPageStore } from 'pages/paradb/map/map_presenter';
import { PDMap } from 'pages/paradb/map/map_schema';
import React from 'react';

export function createMapPage(api: Api) {
  const store = new MapPageStore();
  const presenter = new MapPagePresenter(api, store);

  return observer(({ id, map }: { id: string, map?: PDMap }) => {
    React.useEffect(() => {
      if (map) {
        runInAction(() => store.map = map);
      } else {
        presenter.getMap(id);
      }
    }, [])

    return (
        <MapPage
            map={store.map}
        />
    );
  });
}
