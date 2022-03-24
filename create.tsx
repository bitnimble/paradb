import { createLoginSignupPage } from 'pages/paradb/auth/create';
import { HttpApi } from 'pages/paradb/base/api/api';
import { createInstructionsPage } from 'pages/paradb/instructions/create';
import { createMapPage, createSubmitMapPage } from 'pages/paradb/map/create';
import { createMapList } from 'pages/paradb/map_list/create';
import { createNavBar } from 'pages/paradb/nav_bar/create';
import { installRouter } from 'pages/paradb/router/install';
import { SessionPresenter, SessionStore } from 'pages/paradb/session/session_presenter';
import { createSettingsPage } from 'pages/paradb/settings/create';
import { Skeleton } from 'pages/paradb/skeleton/skeleton';
import * as React from 'react';

export function createApp() {
  const api = new HttpApi();
  const { history, navigate } = installRouter();

  const sessionStore = new SessionStore();
  const sessionPresenter = new SessionPresenter(api, sessionStore);

  const NavBar = createNavBar(sessionStore, sessionPresenter.maybeLoadSession);
  const MapPage = createMapPage(api, navigate, sessionStore);
  const MapList = createMapList(api);
  const LoginSignupPage = createLoginSignupPage(api, navigate);
  const SettingsPage = createSettingsPage(api, navigate, sessionStore);
  const SubmitMapPage = createSubmitMapPage(api, navigate);
  const InstructionsPage = createInstructionsPage();

  return () => (
      <Skeleton
          history={history}
          NavBar={NavBar}
          MapPage={MapPage}
          MapList={MapList}
          LoginSignupPage={LoginSignupPage}
          SettingsPage={SettingsPage}
          SubmitMapPage={SubmitMapPage}
          InstructionsPage={InstructionsPage}
      />
  );
}
