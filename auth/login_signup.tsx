import { observer } from 'mobx-react';
import { LoginSignupField } from 'pages/paradb/auth/login_signup_presenter';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import React from 'react';
import styles from './login_signup.css';

type LoginSignupProps = {
  mode: 'signup' | 'login'
  username: string,
  email: string,
  password: string,
  errors: Map<LoginSignupField, string>;
  onChangeUsername(value: string): void,
  onChangeEmail(value: string): void,
  onChangePassword(value: string): void,
  login(): void,
  signup(): void,
  onNavigateClick(): void,
}

export const LoginSignup = observer(({
  mode,
  username,
  email,
  password,
  errors,
  onChangeUsername,
  onChangeEmail,
  onChangePassword,
  login,
  signup,
  onNavigateClick,
}: LoginSignupProps) => {
  return mode === 'login'
    ? (
      <div className={styles.loginSignup}>
        <Textbox value={username} onChange={onChangeUsername} label="Username" onSubmit={login} error={errors.get('username')}/>
        <Textbox value={password} onChange={onChangePassword} inputType="password" label="Password" error={errors.get('password')} onSubmit={login}/>
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
        <Textbox value={username} onChange={onChangeUsername} label="Username" required={true} error={errors.get('username')} onSubmit={signup}/>
        <Textbox value={email} onChange={onChangeEmail} label="Email" required={true} error={errors.get('email')} onSubmit={signup}/>
        <Textbox value={password} onChange={onChangePassword} inputType="password" label="Password" required={true} error={errors.get('password')} onSubmit={signup}/>
        <div className={styles.submitContainer}>
          <RouteLink to={routeFor([RoutePath.LOGIN])} onClick={onNavigateClick}>Login instead</RouteLink>
          <Button onClick={signup}>Signup</Button>
        </div>
      </div>
    );
});
