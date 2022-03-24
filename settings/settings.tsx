import { observer } from 'mobx-react';
import { FormError } from 'pages/paradb/base/form/form_error';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { SettingsPresenter, SettingsStore } from 'pages/paradb/settings/settings_presenter';
import { User } from 'paradb-api-schema';
import React from 'react';
import styles from './settings.css';

type SettingsProps = { user: User, store: SettingsStore, presenter: SettingsPresenter };

const noop = () => void 0;

@observer
export class Settings extends React.Component<SettingsProps> {
  render() {
    const { user, store, presenter } = this.props;
    const { oldPassword, newPassword, submitting, success, errors } = store;
    return (
      <div className={styles.settings}>
        <T.Large>Profile settings</T.Large>
        <Textbox
          label="Username"
          readOnly={true}
          value={user.username}
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
  }
}
