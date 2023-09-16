import { observer } from 'mobx-react';
import { LoginSignup } from './login_signup';
import { Api } from 'api/api';
import React from 'react';
import { LoginSignupPresenter, LoginSignupStore } from './login_signup_presenter';

export function createLoginSignupPage(api: Api) {
  const store = new LoginSignupStore();
  const presenter = new LoginSignupPresenter(api, store);

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
