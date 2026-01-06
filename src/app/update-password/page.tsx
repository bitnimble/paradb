'use client';

import { useApi } from 'app/api/api_provider';
import { observer } from 'mobx-react';
import React from 'react';
import { UpdatePassword } from './update_password';
import { UpdatePasswordPresenter, UpdatePasswordStore } from './update_password_presenter';

function createUpdatePasswordPage(supabase: ReturnType<typeof useApi>['supabase']) {
  const store = new UpdatePasswordStore();
  const presenter = new UpdatePasswordPresenter(supabase, store);

  return observer(() => {
    return (
      <UpdatePassword
        password={store.password}
        submitting={store.submitting}
        success={store.success}
        errors={store.errors}
        onChangePassword={presenter.onChangePassword}
        updatePassword={presenter.updatePassword}
      />
    );
  });
}

export default () => {
  const api = useApi();
  const [UpdatePasswordPage] = React.useState(() => createUpdatePasswordPage(api.supabase));
  return <UpdatePasswordPage />;
};
