import { observer } from 'mobx-react';
import { createMapPage } from 'pages/paradb/map/create';
import { createMapList } from 'pages/paradb/map_list/create';
import { createNavBar } from 'pages/paradb/nav_bar/create';
import { installRouter } from 'pages/paradb/router/install';
import { Skeleton } from 'pages/paradb/skeleton/skeleton';
import * as React from 'react';

export function createApp() {
  const NavBar = createNavBar();
  const MapPage = createMapPage();
  const MapList = createMapList();

  const { history, navigate } = installRouter();

  return observer(() => (
    <Skeleton
        history={history}
        NavBar={NavBar}
        MapPage={MapPage}
        MapList={MapList}
    />
  ));
}
