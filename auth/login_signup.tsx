import { observer } from 'mobx-react';
import { LoginSignupField } from 'pages/paradb/auth/login_signup_presenter';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { TextboxProps } from 'pages/paradb/base/ui/textbox/create';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import React from 'react';
import styles from './login_signup.css';

type LoginSignupProps = {
  mode: 'signup' | 'login'
  Username: React.ComponentType<TextboxProps>,
  Email: React.ComponentType<TextboxProps>,
  Password: React.ComponentType<TextboxProps>,
  errors: Map<LoginSignupField, string>;
  login(): void,
  signup(): void,
  onNavigateClick(): void,
}

export const LoginSignup = observer(({ mode, Username, Email, Password, errors, login, signup, onNavigateClick }: LoginSignupProps) => {
  return mode === 'login'
    ? (
      <div className={styles.loginSignup}>
        <Username label="Username" onSubmit={login} error={errors.get('username')}/>
        <Password inputType="password" label="Password" error={errors.get('password')} onSubmit={login}/>
        <div className={styles.submitContainer}>
          <RouteLink to={routeFor([RoutePath.SIGNUP])} onClick={onNavigateClick}>Signup instead</RouteLink>
          <Button onClick={login}>Login</Button>
        </div>
        {errors.get('form') && (
          <div className={styles.formError}>
            <T.Tiny color="red">{errors.get('form')}</T.Tiny>
          </div>
        )}
      </div>
    )
    : (
      <div className={styles.loginSignup}>
        <Username label="Username" required={true} error={errors.get('username')} onSubmit={signup}/>
        <Email label="Email" required={true} error={errors.get('email')} onSubmit={signup}/>
        <Password inputType="password" label="Password" required={true} error={errors.get('password')} onSubmit={signup}/>
        <div className={styles.submitContainer}>
          <RouteLink to={routeFor([RoutePath.LOGIN])} onClick={onNavigateClick}>Login instead</RouteLink>
          <Button onClick={signup}>Signup</Button>
        </div>
      </div>
    );
});
