import { Api } from 'app/api/api';
import { action, observable } from 'mobx';
import type { Area } from 'react-easy-crop';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { ImageScaling, renderCroppedAvatar } from './render_avatar';

export type SettingsFields = 'oldPassword' | 'newPassword' | 'avatar' | 'form';

export class SettingsStore extends FormStore<SettingsFields> {
  @observable accessor oldPassword = '';
  @observable accessor newPassword = '';
  @observable accessor submitting = false;
  @observable accessor success: boolean | undefined = undefined;

  /** Object URL of the image currently being cropped, or undefined when the crop dialog is closed. */
  @observable accessor cropSource: string | undefined = undefined;
  @observable accessor avatarSubmitting = false;
}

export class SettingsPresenter extends FormPresenter<SettingsFields> {
  constructor(
    private readonly api: Api,
    private readonly store: SettingsStore,
    private readonly userId: string,
    private readonly onAvatarUpdated: () => void
  ) {
    super(store);
  }

  @action.bound onSelectAvatarFile(file: File) {
    this.clearErrors();
    if (!file.type.startsWith('image/')) {
      this.pushErrors(['avatar'], 'Please choose an image file.');
      return;
    }
    this.setCropSource(URL.createObjectURL(file));
  }

  @action.bound onCancelCrop() {
    this.setCropSource(undefined);
  }

  @action.bound async onSaveCrop(area: Area, scaling: ImageScaling) {
    const source = this.store.cropSource;
    if (source == null) {
      return;
    }
    this.clearErrors();
    this.setAvatarSubmitting(true);
    try {
      const png = await renderCroppedAvatar(source, area, scaling);
      const resp = await this.api.setProfilePicture(png);
      if (resp.success) {
        this.setCropSource(undefined);
        this.onAvatarUpdated();
      } else {
        this.pushErrors(['avatar'], resp.errorMessage || 'Failed to upload profile picture.');
      }
    } catch {
      this.pushErrors(['avatar'], 'Could not process this image. Please try another file.');
    } finally {
      this.setAvatarSubmitting(false);
    }
  }

  @action private setCropSource(url: string | undefined) {
    // Revoke the previous object URL so we don't leak it when replacing or closing the dialog.
    if (this.store.cropSource != null) {
      URL.revokeObjectURL(this.store.cropSource);
    }
    this.store.cropSource = url;
  }
  @action private setAvatarSubmitting(value: boolean) {
    this.store.avatarSubmitting = value;
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
      id: this.userId,
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
