import { TextboxProps } from 'pages/paradb/base/ui/textbox/create';
import React from 'react';
import styles from './login_signup.css';

type LoginSignupProps = {
  Username: React.ComponentType<TextboxProps>,
  Password: React.ComponentType<TextboxProps>,
  login(): void,
}

export const LoginSignup = (({ Username, Password, login }: LoginSignupProps) => {
  return (
    <div className={styles.loginSignup}>
      <Username label="Login"/>
      <Password inputType="password" label="Password"/>
      <button onClick={login}>Login</button>
    </div>
  );
});
