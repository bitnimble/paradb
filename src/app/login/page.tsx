'use client';

import { LoginSignup } from 'app/_auth/login_signup';
import { LoginSignupPresenter, LoginSignupStore } from 'app/_auth/login_signup_presenter';
import { useApi } from 'app/api/api_provider';
import { observer, useLocalObservable } from 'mobx-react-lite';

export default observer(() => {
  const api = useApi();
  const store = useLocalObservable(() => new LoginSignupStore());
  const presenter = new LoginSignupPresenter(api, store);

  return (
    <LoginSignup
      mode="login"
      username={store.username}
      email={store.email}
      password={store.password}
      submitting={store.submitting}
      errors={store.errors}
      onChangeUsername={presenter.onChangeUsername}
      onChangeEmail={presenter.onChangeEmail}
      onChangePassword={presenter.onChangePassword}
      login={presenter.onLogin}
      signup={presenter.onSignup}
      onNavigateClick={store.reset}
    />
  );
});
