import { observer } from 'mobx-react';
import { LoginSignup } from 'pages/paradb/auth/login_signup';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import React from 'react';
import { LoginSignupPresenter, LoginSignupStore } from './login_signup_presenter';

export function createLoginSignupPage(api: Api, navigate: Navigate) {
  const store = new LoginSignupStore();
  const presenter = new LoginSignupPresenter(api, navigate, store);

  return observer(({ mode }: { mode: 'signup' | 'login' }) => {
    return (
        <LoginSignup
            mode={mode}
            username={store.username}
            email={store.email}
            password={store.password}
            errors={store.errors}
            onChangeUsername={presenter.onChangeUsername}
            onChangeEmail={presenter.onChangeEmail}
            onChangePassword={presenter.onChangePassword}
            login={presenter.login}
            signup={presenter.signup}
            onNavigateClick={store.reset}
        />
    );
  });
}
