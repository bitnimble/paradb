import { checkExists } from 'base/preconditions';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import { SessionStore } from 'pages/paradb/session/session_presenter';
import { Settings } from 'pages/paradb/settings/settings';
import { SettingsPresenter, SettingsStore } from 'pages/paradb/settings/settings_presenter';
import React from 'react';

export function createSettingsPage(api: Api, navigate: Navigate, sessionStore: SessionStore) {
  const store = new SettingsStore();
  const presenter = new SettingsPresenter(api, store, sessionStore);

  return observer(() =>
    sessionStore.user
      ? <Settings user={sessionStore.user} store={store} presenter={presenter}/>
      : null
  );
}
