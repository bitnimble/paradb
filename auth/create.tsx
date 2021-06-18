import { action } from 'mobx';
import { observer } from 'mobx-react';
import { LoginSignup } from 'pages/paradb/auth/login_signup';
import { Api } from 'pages/paradb/base/api/api';
import { createTextbox } from 'pages/paradb/base/ui/textbox/create';
import { Navigate } from 'pages/paradb/router/install';
import React from 'react';
import { useComponentDidMount } from '../base/helpers';
import { LoginSignupPresenter } from './login_signup_presenter';

export function createLoginSignupPage(api: Api, navigate: Navigate) {
  const [UsernameTextbox, username] = createTextbox();
  const [EmailTextbox, email] = createTextbox();
  const [PasswordTextbox, password] = createTextbox();
  const presenter = new LoginSignupPresenter(api, navigate, username, email, password);

  return observer(({ mode }: { mode: 'signup' | 'login' }) => {
    useComponentDidMount(action(() => {
      username.set('');
      email.set('');
      password.set('');
    }));

    return (
      <LoginSignup
          mode={mode}
          Username={UsernameTextbox}
          Email={EmailTextbox}
          Password={PasswordTextbox}
          login={presenter.login}
          signup={presenter.signup}
      />
    );
  });
}
