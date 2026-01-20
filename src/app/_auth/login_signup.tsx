import { observer } from 'mobx-react';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { RouteLink } from 'ui/base/text/link';
import { Textbox } from 'ui/base/textbox/textbox';
import { routeFor, RoutePath } from 'utils/routes';
import styles from './login_signup.module.css';
import { LoginSignupField } from './login_signup_presenter';

type LoginSignupProps = {
  mode: 'signup' | 'login';
  username: string;
  email: string;
  password: string;
  submitting: boolean;
  errors: Map<LoginSignupField, string>;
  onChangeUsername(value: string): void;
  onChangeEmail(value: string): void;
  onChangePassword(value: string): void;
  login(): void;
  signup(): void;
  onNavigateClick(): void;
};

export const LoginSignup = observer(
  ({
    mode,
    username,
    email,
    password,
    submitting,
    errors,
    onChangeUsername,
    onChangeEmail,
    onChangePassword,
    login,
    signup,
    onNavigateClick,
  }: LoginSignupProps) => {
    return mode === 'login' ? (
      <div className={styles.loginSignup}>
        <Textbox
          value={username}
          onChange={onChangeUsername}
          label="Username"
          onSubmit={login}
          error={errors.get('username')}
        />
        <Textbox
          value={password}
          onChange={onChangePassword}
          inputType="password"
          label="Password"
          error={errors.get('password')}
          onSubmit={login}
        />
        <div className={styles.submitContainer}>
          <div className={styles.accountActions}>
            <RouteLink href={routeFor([RoutePath.SIGNUP])} onClick={onNavigateClick}>
              Signup instead
            </RouteLink>
            <RouteLink href={routeFor([RoutePath.PASSWORD, RoutePath.RESET])}>
              Forgot password?
            </RouteLink>
          </div>
          <Button loading={submitting} onClick={login}>
            Login
          </Button>
        </div>
        <FormError error={errors.get('form')} />
      </div>
    ) : (
      <div className={styles.loginSignup}>
        <Textbox
          value={username}
          onChange={onChangeUsername}
          label="Username"
          required={true}
          error={errors.get('username')}
          onSubmit={signup}
        />
        <Textbox
          value={email}
          onChange={onChangeEmail}
          label="Email"
          required={true}
          error={errors.get('email')}
          onSubmit={signup}
        />
        <Textbox
          value={password}
          onChange={onChangePassword}
          inputType="password"
          label="Password"
          required={true}
          error={errors.get('password')}
          onSubmit={signup}
        />
        <div className={styles.submitContainer}>
          <RouteLink href={routeFor([RoutePath.LOGIN])} onClick={onNavigateClick}>
            Login instead
          </RouteLink>
          <Button loading={submitting} onClick={signup}>
            Signup
          </Button>
        </div>
        <FormError error={errors.get('form')} />
      </div>
    );
  }
);
