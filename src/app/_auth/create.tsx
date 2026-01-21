import { Api } from 'app/api/api';
import { observer } from 'mobx-react';
import { LoginSignup } from './login_signup';
import { LoginSignupPresenter, LoginSignupStore } from './login_signup_presenter';

export function createLoginSignupPage(api: Api) {
  const store = new LoginSignupStore();
  const presenter = new LoginSignupPresenter(api, store);

  return observer(({ mode }: { mode: 'signup' | 'login' }) => {
    return (
      <LoginSignup
        mode={mode}
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
}
