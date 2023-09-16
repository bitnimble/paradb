import { checkExists } from 'base/preconditions';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { Api } from 'api/api';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { SessionStore } from 'session/session_presenter';

export type SettingsFields = 'oldPassword' | 'newPassword' | 'form';

export class SettingsStore extends FormStore<SettingsFields> {
  oldPassword = '';
  newPassword = '';
  submitting = false;
  success?: boolean = undefined;

  constructor() {
    super();
    makeObservable(this, {
      oldPassword: observable.ref,
      newPassword: observable.ref,
      submitting: observable.ref,
      success: observable.ref,
    });
  }
}

export class SettingsPresenter extends FormPresenter<SettingsFields> {
  constructor(
    private readonly api: Api,
    private readonly store: SettingsStore,
    private readonly sessionStore: SessionStore
  ) {
    super(store);
    makeObservable(this, {
      onChangeOldPassword: action.bound,
      onChangeNewPassword: action.bound,
      changePassword: action.bound,
    });
  }

  onChangeOldPassword = (value: string) => (this.store.oldPassword = value);
  onChangeNewPassword = (value: string) => (this.store.newPassword = value);
  private setSuccess = action((value: boolean | undefined) => (this.store.success = value));
  private setSubmitting = action((value: boolean) => (this.store.submitting = value));

  async changePassword() {
    runInAction(() => this.clearErrors());

    const { oldPassword, newPassword } = this.store;
    const errors = [
      ...this.checkPasswordRestrictionFields(['newPassword', newPassword]),
      ...this.checkRequiredFields(['oldPassword', oldPassword], ['newPassword', newPassword]),
    ];
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const resp = await this.api.changePassword({
      id: checkExists(this.sessionStore.user).id,
      oldPassword: this.store.oldPassword,
      newPassword: this.store.newPassword,
    });
    if (resp.success) {
      this.setSuccess(true);
      this.onChangeOldPassword('');
      this.onChangeNewPassword('');
      setTimeout(() => this.setSuccess(undefined), 2000);
    } else {
      this.setSuccess(false);
      if (resp.oldPassword) {
        this.pushErrors(['oldPassword'], resp.oldPassword);
      }
      if (resp.newPassword) {
        this.pushErrors(['newPassword'], resp.newPassword);
      }
      if (resp.errorMessage.trim() !== '') {
        this.pushErrors(['form'], resp.errorMessage);
      }
    }
    this.setSubmitting(false);
  }
}
