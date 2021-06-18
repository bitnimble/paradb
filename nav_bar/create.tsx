import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { useComponentDidMount } from 'pages/paradb/base/helpers';
import { NavBar } from 'pages/paradb/nav_bar/nav_bar';
import { NavBarPresenter, NavBarStore } from 'pages/paradb/nav_bar/nav_bar_presenter';
import React from 'react';

export function createNavBar(api: Api) {
  const store = new NavBarStore();
  const presenter = new NavBarPresenter(api, store);

  return observer(() => {
    useComponentDidMount(() => {
      presenter.getUserInfo();
    });
    return <NavBar user={store.user}/>
  });
}
