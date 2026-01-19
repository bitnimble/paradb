'use client';

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { Textbox } from 'ui/base/textbox/textbox';
import styles from './update_password.module.css';
import { UpdatePasswordPresenter, UpdatePasswordStore } from './update_password_presenter';

export default observer(() => {
  const [store] = useState(new UpdatePasswordStore());
  const presenter = new UpdatePasswordPresenter(store);

  if (store.success) {
    return (
      <div className={styles.updatePassword}>
        <p>Your password has been updated. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className={styles.updatePassword}>
      <p>Enter your new password.</p>
      <Textbox
        value={store.password}
        onChange={presenter.onChangePassword}
        inputType="password"
        label="New password"
        onSubmit={presenter.updatePassword}
        error={store.errors.get('password')}
      />
      <div className={styles.submitContainer}>
        <Button loading={store.submitting} onClick={presenter.updatePassword}>
          Update password
        </Button>
      </div>
      <FormError error={store.errors.get('form')} />
    </div>
  );
});
