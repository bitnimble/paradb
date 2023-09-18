'use client';

import { FormError } from 'ui/base/form/form_error';
import { T } from 'ui/base/text/text';
import { Button } from 'ui/base/button/button';
import { Textbox } from 'ui/base/textbox/textbox';
import React from 'react';
import { useSession } from 'session/session_provider';
import styles from './page.module.css';
import { SettingsPresenter, SettingsStore } from './settings_presenter';
import { useApi } from 'app/api/api_provider';
import { observer } from 'mobx-react';

const noop = () => void 0;

export default observer(() => {
  const session = useSession();
  const api = useApi();
  const [store] = React.useState(new SettingsStore());
  if (!session.user) {
    return null;
  }
  const presenter = new SettingsPresenter(api, store, session);

  const { oldPassword, newPassword, submitting, success, errors } = store;
  return (
    <div className={styles.settings}>
      <T.Large>Profile settings</T.Large>
      <Textbox
        label="Username"
        readOnly={true}
        value={session.user.username}
        error={undefined}
        onChange={noop}
        tooltip="Changing your username is not currently implemented."
      />

      <T.Large>Change password</T.Large>
      <Textbox
        label="Current password"
        required={true}
        value={oldPassword}
        error={errors.get('oldPassword')}
        inputType="password"
        onChange={presenter.onChangeOldPassword}
        onSubmit={presenter.changePassword}
      />
      <Textbox
        label="New password"
        required={true}
        value={newPassword}
        error={errors.get('newPassword')}
        inputType="password"
        onChange={presenter.onChangeNewPassword}
        onSubmit={presenter.changePassword}
      />
      <Button
        loading={submitting}
        style={success ? 'success' : undefined}
        onClick={presenter.changePassword}
      >
        {success ? 'Password changed' : 'Change password'}
      </Button>
      <FormError error={errors.get('form')} />
    </div>
  );
});
