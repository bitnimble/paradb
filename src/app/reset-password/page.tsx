'use client';

import { useApi } from 'app/api/api_provider';
import { observer } from 'mobx-react';
import React from 'react';
import { ResetPassword } from './reset_password';
import { ResetPasswordPresenter, ResetPasswordStore } from './reset_password_presenter';

function createResetPasswordPage(supabase: ReturnType<typeof useApi>['supabase']) {
  const store = new ResetPasswordStore();
  const presenter = new ResetPasswordPresenter(supabase, store);

  return observer(() => {
    return (
      <ResetPassword
        email={store.email}
        submitting={store.submitting}
        success={store.success}
        errors={store.errors}
        onChangeEmail={presenter.onChangeEmail}
        requestReset={presenter.requestReset}
      />
    );
  });
}

export default () => {
  const api = useApi();
  const [ResetPasswordPage] = React.useState(() => createResetPasswordPage(api.supabase));
  return <ResetPasswordPage />;
};
