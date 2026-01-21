import { Api } from 'app/api/api';
import { checkExists } from 'base/preconditions';
import { action, observable } from 'mobx';
import { SessionStore } from 'session/session_presenter';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';

export type SettingsFields = 'oldPassword' | 'newPassword' | 'form';

export class SettingsStore extends FormStore<SettingsFields> {
  @observable accessor oldPassword = '';
  @observable accessor newPassword = '';
  @observable accessor submitting = false;
  @observable accessor success: boolean | undefined = undefined;
}

export class SettingsPresenter extends FormPresenter<SettingsFields> {
  constructor(
    private readonly api: Api,
    private readonly store: SettingsStore,
    private readonly sessionStore: SessionStore
  ) {
    super(store);
  }

  @action.bound onChangeOldPassword(value: string) {
    this.store.oldPassword = value;
  }
  @action.bound onChangeNewPassword(value: string) {
    this.store.newPassword = value;
  }
  @action private setSuccess(value: boolean | undefined) {
    this.store.success = value;
  }
  @action private setSubmitting(value: boolean) {
    this.store.submitting = value;
  }

  @action.bound async onChangePassword() {
    this.clearErrors();

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
