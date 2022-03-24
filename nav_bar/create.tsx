import { observer } from 'mobx-react';
import { useComponentDidMount } from 'pages/paradb/base/helpers';
import { NavBar } from 'pages/paradb/nav_bar/nav_bar';
import { SessionStore } from 'pages/paradb/session/session_presenter';
import React from 'react';

export function createNavBar(sessionStore: SessionStore, maybeLoadSession: () => void) {
  return observer(() => {
    useComponentDidMount(() => {
      maybeLoadSession();
    });
    return <NavBar user={sessionStore.user}/>;
  });
}
