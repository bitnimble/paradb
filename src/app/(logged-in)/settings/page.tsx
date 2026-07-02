'use client';

import { useApi } from 'app/api/api_provider';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { redirect, useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { T } from 'ui/base/text/text';
import { Textbox } from 'ui/base/textbox/textbox';
import { useSession } from 'ui/session/session_provider';
import { RoutePath, routeFor } from 'utils/routes';
import { AvatarCropDialog } from './avatar_crop_dialog';
import styles from './page.module.css';
import { SettingsPresenter, SettingsStore } from './settings_presenter';

const noop = () => void 0;

export default observer(() => {
  const session = useSession();
  const api = useApi();
  const router = useRouter();
  const store = useLocalObservable(() => new SettingsStore());
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!session) {
    return redirect(routeFor([RoutePath.LOGIN]));
  }
  const presenter = new SettingsPresenter(api, store, session.id, () => router.refresh());

  const { oldPassword, newPassword, submitting, success, errors } = store;
  return (
    <div className={styles.settings}>
      <T.Large>Profile settings</T.Large>
      <Textbox
        label="Username"
        readOnly={true}
        value={session.username}
        error={undefined}
        onChange={noop}
        tooltip="Changing your username is not currently implemented."
      />

      <T.Large>Profile picture</T.Large>
      <div className={styles.avatarSection}>
        {session.avatarUrl != null ? (
          <img src={session.avatarUrl} alt="Profile picture" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder} />
        )}
        <Button onClick={() => fileInputRef.current?.click()}>Upload picture</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file != null) {
              presenter.onSelectAvatarFile(file);
            }
            // Reset so selecting the same file again still fires onChange.
            e.target.value = '';
          }}
        />
      </div>
      <FormError error={errors.get('avatar')} />
      {store.cropSource != null ? (
        <AvatarCropDialog
          source={store.cropSource}
          submitting={store.avatarSubmitting}
          error={errors.get('avatar')}
          onSave={presenter.onSaveCrop}
          onCancel={presenter.onCancelCrop}
        />
      ) : null}

      <T.Large>Change password</T.Large>
      <Textbox
        label="Current password"
        required={true}
        value={oldPassword}
        error={errors.get('oldPassword')}
        inputType="password"
        onChange={presenter.onChangeOldPassword}
        onSubmit={presenter.onChangePassword}
      />
      <Textbox
        label="New password"
        required={true}
        value={newPassword}
        error={errors.get('newPassword')}
        inputType="password"
        onChange={presenter.onChangeNewPassword}
        onSubmit={presenter.onChangePassword}
      />
      <Button
        loading={submitting}
        style={success ? 'success' : undefined}
        onClick={presenter.onChangePassword}
      >
        {success ? 'Password changed' : 'Change password'}
      </Button>
      <FormError error={errors.get('form')} />
    </div>
  );
});
