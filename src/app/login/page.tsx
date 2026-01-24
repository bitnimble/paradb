'use client';

import { useApi } from 'app/api/api_provider';
import { observer, useLocalObservable } from 'mobx-react-lite';
import styles from 'ui/auth/login_signup.module.css';
import { LoginSignupPresenter, LoginSignupStore } from 'ui/auth/login_signup_presenter';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { RouteLink } from 'ui/base/text/link';
import { Textbox } from 'ui/base/textbox/textbox';
import { RoutePath, routeFor } from 'utils/routes';

export default observer(() => {
  const api = useApi();
  const store = useLocalObservable(() => new LoginSignupStore());
  const presenter = new LoginSignupPresenter(api, store);

  return (
    <div className={styles.loginSignup}>
      <Textbox
        value={store.username}
        onChange={presenter.onChangeUsername}
        label="Username/email"
        onSubmit={presenter.onLogin}
        error={store.errors.get('username')}
      />
      <Textbox
        value={store.password}
        onChange={presenter.onChangePassword}
        inputType="password"
        label="Password"
        error={store.errors.get('password')}
        onSubmit={presenter.onLogin}
      />
      <div className={styles.submitContainer}>
        <div className={styles.accountActions}>
          <RouteLink href={routeFor([RoutePath.SIGNUP])}>Signup instead</RouteLink>
          <RouteLink href={routeFor([RoutePath.PASSWORD, RoutePath.RESET])}>
            Forgot password?
          </RouteLink>
        </div>
        <Button loading={store.submitting} onClick={presenter.onLogin}>
          Login
        </Button>
      </div>
      <FormError error={store.errors.get('form')} />
    </div>
  );
});
