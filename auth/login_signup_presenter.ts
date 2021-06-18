import { action, IObservableValue, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

export type LoginSignupField = 'username' | 'password' | 'email';
export const enum FieldError {
  REQUIRED = 'This field is required.',
  INVALID_EMAIL_FORMAT = 'This doesn\'t look like a valid email address.',
  PASSWORD_TOO_SHORT = 'Your password needs to be at least 8 characters long.',
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
    }
  };

  @action
  private checkRequiredFields(...fields: [LoginSignupField, string][]) {
    const errorFields = fields.filter(f => f[1].trim() === '').map(f => f[0]);
    this.pushErrors(errorFields, FieldError.REQUIRED);
    return errorFields;
  }

  @action
  private checkEmailFields(...fields: [LoginSignupField, string][]) {
    const errorFields = fields.filter(f => !f[1].trim().match(/^\S+@\S+$/)).map(f => f[0]);
    this.pushErrors(errorFields, FieldError.INVALID_EMAIL_FORMAT);
    return errorFields;
  }

  @action
  private checkPasswordRestrictionFields(...fields: [LoginSignupField, string][]) {
    const errorFields = fields.filter(f => f.length < 8).map(f => f[0]);
    this.pushErrors(errorFields, FieldError.PASSWORD_TOO_SHORT);
    return errorFields;
  }

  @action
  private pushErrors(fields: LoginSignupField[], error: FieldError) {
    fields.forEach(f => this.store.errors.set(f, error));
  }
}
