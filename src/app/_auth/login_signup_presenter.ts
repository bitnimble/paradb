import { Api } from 'app/api/api';
import { action, observable } from 'mobx';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

export type LoginSignupField = 'username' | 'password' | 'email' | 'form';

export class LoginSignupStore extends FormStore<LoginSignupField> {
  @observable accessor submitting = false;
  @observable accessor username = '';
  @observable accessor email = '';
  @observable accessor password = '';

  @action.bound reset() {
    this.errors.clear();
    this.email = '';
    this.password = '';
    this.username = '';
    this.submitting = false;
  }
}

export class LoginSignupPresenter extends FormPresenter<LoginSignupField> {
  constructor(
    private readonly api: Api,
    private readonly store: LoginSignupStore
  ) {
    super(store);
  }

  @action.bound onChangeUsername(value: string) {
    this.store.username = value;
  }
  @action.bound onChangeEmail(value: string) {
    this.store.email = value;
  }
  @action.bound onChangePassword(value: string) {
    this.store.password = value;
  }
  @action private setSubmitting(submitting: boolean) {
    this.store.submitting = submitting;
  }

  readonly onLogin = async () => {
    this.clearErrors();
    const username = this.store.username;
    const password = this.store.password;
    const errors = this.checkRequiredFields(['username', username], ['password', password]);
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const resp = await this.api.login({ username, password });
    this.setSubmitting(false);
    if (resp.success) {
      await this.api.supabase.auth.setSession({
        access_token: resp.accessToken,
        refresh_token: resp.refreshToken,
      });
      window.location.href = routeFor([RoutePath.MAP_LIST]);
    } else {
      this.pushErrors(['form'], resp.errorMessage || 'Could not login. Please try again later.');
    }
  };

  readonly onSignup = async () => {
    this.clearErrors();
    const username = this.store.username;
    const email = this.store.email;
    const password = this.store.password;
    const errors = [
      ...this.checkEmailFields(['email', email]),
      ...this.checkPasswordRestrictionFields(['password', password]),
      ...this.checkRequiredFields(['username', username], ['password', password], ['email', email]),
    ];
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const resp = await this.api.signup({ username, email, password });
    this.setSubmitting(false);
    if (resp.success) {
      if (resp.session) {
        await this.api.supabase.auth.setSession({
          access_token: resp.session.accessToken,
          refresh_token: resp.session.refreshToken,
        });
      } else {
        // TODO: show message that they need to confirm their email. Currently not needed as email
        // verification is not enabled in the Supabase project settings.
      }
      window.location.href = routeFor([RoutePath.MAP_LIST]);
    } else {
      if (resp.email) {
        this.pushErrors(['email'], resp.email);
      }
      if (resp.username) {
        this.pushErrors(['username'], resp.username);
      }
      if (resp.password) {
        this.pushErrors(['password'], resp.password);
      }
    }
  };
}
