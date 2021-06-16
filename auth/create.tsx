import { observer } from 'mobx-react';
import { LoginSignup } from 'pages/paradb/auth/login_signup';
import { Api } from 'pages/paradb/base/api/api';
import { createTextbox } from 'pages/paradb/base/ui/textbox/create';
import { Navigate } from 'pages/paradb/router/install';
import React from 'react';
import { useComponentDidMount } from '../base/helpers';
import { LoginSignupPresenter } from './login_signup_presenter';

export function createLoginSignupPage(api: Api, navigate: Navigate) {
  let presenter: LoginSignupPresenter;

  return observer(() => {
    const [UsernameTextbox, username] = createTextbox();
    const [PasswordTextbox, password] = createTextbox();

    useComponentDidMount(() => {
      presenter = new LoginSignupPresenter(api, navigate, username, password)
    });

    const login = () => presenter.login();

    return (
      <LoginSignup Username={UsernameTextbox} Password={PasswordTextbox} login={login}/>
    );
  });
}
