import { action, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { FormPresenter, FormStore } from 'pages/paradb/base/form/form_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

export type LoginSignupField = 'username' | 'password' | 'email' | 'form';

export class LoginSignupStore extends FormStore<LoginSignupField> {
  @observable.ref
  username = '';

  @observable.ref
  email = '';

  @observable.ref
  password = '';
}

export class LoginSignupPresenter extends FormPresenter<LoginSignupField> {
  constructor(
      private readonly api: Api,
      private readonly navigate: Navigate,
      private readonly store: LoginSignupStore,
  ) {
    super(store);
  }

  onChangeUsername = action((value: string) => this.store.username = value);
  onChangeEmail = action((value: string) => this.store.email = value);
  onChangePassword = action((value: string) => this.store.password = value);

  login = async () => {
    runInAction(() => this.store.errors.clear());
    const username = this.store.username;
    const password = this.store.password;
    const errors = this.checkRequiredFields(['username', username], ['password', password]);
    if (errors.length) {
      return;
    }

    const resp = await this.api.login({ username, password });
    if (resp.success) {
      this.navigate([RoutePath.MAP_LIST], true);
    } else {
      this.pushErrors(['form'], resp.errorMessage || 'Could not login. Please try again later.');
    }
  };

  signup = async () => {
    runInAction(() => this.store.errors.clear());
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

    const resp = await this.api.signup({ username, email, password });
    if (resp.success) {
      this.navigate([RoutePath.MAP_LIST], true);
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
