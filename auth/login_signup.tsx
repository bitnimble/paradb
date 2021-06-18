import { RouteLink } from 'pages/paradb/base/text/link';
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
  login(): void,
  signup(): void,
}

export const LoginSignup = (({ mode, Username, Email, Password, login, signup }: LoginSignupProps) => {
  return mode === 'login'
    ? (
      <div className={styles.loginSignup}>
        <Username label="Username"/>
        <Password inputType="password" label="Password"/>
        <div className={styles.submitContainer}>
          <RouteLink to={routeFor([RoutePath.SIGNUP])}>Signup instead</RouteLink>
          <Button onClick={login}>Login</Button>
        </div>
      </div>
    )
    : (
      <div className={styles.loginSignup}>
        <Username label="Username"/>
        <Email label="Email"/>
        <Password inputType="password" label="Password"/>
        <div className={styles.submitContainer}>
          <RouteLink to={routeFor([RoutePath.LOGIN])}>Login instead</RouteLink>
          <Button onClick={signup}>Signup</Button>
        </div>
      </div>
    );
});
