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
        label="Username"
        required={true}
        error={store.errors.get('username')}
        onSubmit={presenter.onSignup}
      />
      <Textbox
        value={store.email}
        onChange={presenter.onChangeEmail}
        label="Email"
        required={true}
        error={store.errors.get('email')}
        onSubmit={presenter.onSignup}
      />
      <Textbox
        value={store.password}
        onChange={presenter.onChangePassword}
        inputType="password"
        label="Password"
        required={true}
        error={store.errors.get('password')}
        onSubmit={presenter.onSignup}
      />
      <div className={styles.submitContainer}>
        <RouteLink href={routeFor([RoutePath.LOGIN])}>Login instead</RouteLink>
        <Button loading={store.submitting} onClick={presenter.onSignup}>
          Signup
        </Button>
      </div>
      <FormError error={store.errors.get('form')} />
    </div>
  );
});
