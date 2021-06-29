import { action, observable } from 'mobx';

const enum FieldError {
  REQUIRED = 'This field is required',
  INVALID_EMAIL_FORMAT = 'This doesn\'t look like a valid email address',
  PASSWORD_TOO_SHORT = 'Your password needs to be at least 8 characters long',
}

export class FormStore<Field extends string> {
  @observable.shallow
  errors = new Map<Field, string>();
}

export class FormPresenter<Field extends string> {
  constructor(private readonly _store: FormStore<Field>) { }

  @action
  protected checkRequiredFields(...fields: (readonly [Field, string | undefined])[]) {
    const errorFields = fields.filter(f => f[1] == null || f[1].trim() === '').map(f => f[0]);
    this.pushErrors(errorFields, FieldError.REQUIRED);
    return errorFields;
  }

  @action
  protected checkEmailFields(...fields: (readonly [Field, string])[]) {
    const errorFields = fields.filter(f => !f[1].trim().match(/^\S+@\S+$/)).map(f => f[0]);
    this.pushErrors(errorFields, FieldError.INVALID_EMAIL_FORMAT);
    return errorFields;
  }

  @action
  protected checkPasswordRestrictionFields(...fields: (readonly [Field, string])[]) {
    const errorFields = fields.filter(f => f[1].length < 8).map(f => f[0]);
    this.pushErrors(errorFields, FieldError.PASSWORD_TOO_SHORT);
    return errorFields;
  }

  @action
  protected pushErrors(fields: Field[], error: string) {
    fields.forEach(f => this._store.errors.set(f, error));
  }
}
