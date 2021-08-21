import { createLoginSignupPage } from 'pages/paradb/auth/create';
import { HttpApi } from 'pages/paradb/base/api/api';
import { createMapPage, createSubmitMapPage } from 'pages/paradb/map/create';
import { createMapList } from 'pages/paradb/map_list/create';
import { createNavBar } from 'pages/paradb/nav_bar/create';
import { installRouter } from 'pages/paradb/router/install';
import { Skeleton } from 'pages/paradb/skeleton/skeleton';
import * as React from 'react';

export function createApp() {
  const api = new HttpApi();
  const { history, navigate } = installRouter();

  const NavBar = createNavBar(api);
  const MapPage = createMapPage(api);
  const MapList = createMapList(api);
  const LoginSignupPage = createLoginSignupPage(api, navigate);
  const SubmitMapPage = createSubmitMapPage(api, navigate);

  return () => (
      <Skeleton
          history={history}
          NavBar={NavBar}
          MapPage={MapPage}
          MapList={MapList}
          LoginSignupPage={LoginSignupPage}
          SubmitMapPage={SubmitMapPage}
      />
  );
}
