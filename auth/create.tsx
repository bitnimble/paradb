import { action, trace } from 'mobx';
import { observer } from 'mobx-react';
import { LoginSignup } from 'pages/paradb/auth/login_signup';
import { Api } from 'pages/paradb/base/api/api';
import { createTextbox } from 'pages/paradb/base/ui/textbox/create';
import { Navigate } from 'pages/paradb/router/install';
import React from 'react';
import { useComponentDidMount } from '../base/helpers';
import { LoginSignupPresenter, LoginSignupStore } from './login_signup_presenter';

export function createLoginSignupPage(api: Api, navigate: Navigate) {
  const [UsernameTextbox, username] = createTextbox();
  const [EmailTextbox, email] = createTextbox();
  const [PasswordTextbox, password] = createTextbox();
  const store = new LoginSignupStore();
  const presenter = new LoginSignupPresenter(api, navigate, store, username, email, password);

  return observer(({ mode }: { mode: 'signup' | 'login' }) => {
    useComponentDidMount(action(() => {
      store.errors.clear();
      username.set('');
      email.set('');
      password.set('');
    }));

    trace();

    return (
      <LoginSignup
          mode={mode}
          Username={UsernameTextbox}
          Email={EmailTextbox}
          Password={PasswordTextbox}
          errors={store.errors}
          login={presenter.login}
          signup={presenter.signup}
      />
    );
  });
}
