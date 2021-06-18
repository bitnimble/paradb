import { action, IObservableValue, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

export type LoginSignupField = 'username' | 'password' | 'email';
export const enum FieldError {
  REQUIRED = 'This field is required.',
}

export class LoginSignupStore {
  @observable.shallow
  errors = new Map<LoginSignupField, FieldError>();
}

export class LoginSignupPresenter {
  constructor(
      private readonly api: Api,
      private readonly navigate: Navigate,
      private readonly store: LoginSignupStore,
      private readonly username: IObservableValue<string>,
      private readonly email: IObservableValue<string>,
      private readonly password: IObservableValue<string>,
  ) { }

  login = async () => {
    runInAction(() => this.store.errors.clear());
    const username = this.username.get();
    const password = this.password.get();
    const errors = this.checkRequiredFields(['username', username], ['password', password]);
    if (errors.length) {
      return;
    }

    const resp = await this.api.login({ username, password });
    if (resp.success) {
      this.navigate([RoutePath.MAP_LIST], true);
    }
  };

  signup = async () => {
    runInAction(() => this.store.errors.clear());
    const username = this.username.get();
    const email = this.email.get();
    const password = this.password.get();
    const errors = this.checkRequiredFields(['username', username], ['password', password], ['email', email]);
    if (errors.length) {
      return;
    }

    const resp = await this.api.signup({ username, email, password });
    if (resp.success) {
      this.navigate([RoutePath.MAP_LIST], true);
    }
  };

  @action
  private checkRequiredFields(...fields: [LoginSignupField, string][]) {
    const errors = fields.filter(f => f[1].trim() === '').map(f => f[0]);
    errors.forEach(f => this.store.errors.set(f, FieldError.REQUIRED));
    return errors;
  }
}
