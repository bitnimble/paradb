'use client';

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { RouteLink } from 'ui/base/text/link';
import { Textbox } from 'ui/base/textbox/textbox';
import { RoutePath, routeFor } from 'utils/routes';
import styles from './reset_password.module.css';
import { ResetPasswordPresenter, ResetPasswordStore } from './reset_password_presenter';

export default observer(() => {
  const [store] = useState(new ResetPasswordStore());
  const presenter = new ResetPasswordPresenter(store);

  if (store.success) {
    return (
      <div className={styles.resetPassword}>
        <p>Check your email for a password reset link.</p>
        <RouteLink href={routeFor([RoutePath.LOGIN])}>Back to login</RouteLink>
      </div>
    );
  }

  return (
    <div className={styles.resetPassword}>
      <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
      <Textbox
        value={store.email}
        onChange={presenter.onChangeEmail}
        label="Email"
        onSubmit={presenter.requestReset}
        error={store.errors.get('email')}
      />
      <div className={styles.submitContainer}>
        <RouteLink href={routeFor([RoutePath.LOGIN])}>Back to login</RouteLink>
        <Button loading={store.submitting} onClick={presenter.requestReset}>
          Send reset link
        </Button>
      </div>
      <FormError error={store.errors.get('form')} />
    </div>
  );
});
