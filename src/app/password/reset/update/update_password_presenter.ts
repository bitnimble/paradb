import { action, makeObservable, observable, runInAction } from 'mobx';
import { createClient } from 'services/session/supabase_client';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

export type UpdatePasswordField = 'password' | 'form';

export class UpdatePasswordStore extends FormStore<UpdatePasswordField> {
  submitting = false;
  password = '';
  success = false;

  constructor() {
    super();
    makeObservable(this, {
      password: observable.ref,
      submitting: observable.ref,
      success: observable.ref,
    });
  }
}

export class UpdatePasswordPresenter extends FormPresenter<UpdatePasswordField> {
  private readonly supabase = createClient();

  constructor(private readonly store: UpdatePasswordStore) {
    super(store);
    makeObservable(this, {
      onChangePassword: action.bound,
      updatePassword: action.bound,
    });
  }

  onChangePassword = (value: string) => (this.store.password = value);
  private setSubmitting = action((value: boolean) => (this.store.submitting = value));
  private setSuccess = action((value: boolean) => (this.store.success = value));

  async updatePassword() {
    runInAction(() => this.clearErrors());
    const password = this.store.password;
    const errors = [
      ...this.checkPasswordRestrictionFields(['password', password]),
      ...this.checkRequiredFields(['password', password]),
    ];
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const { error } = await this.supabase.auth.updateUser({ password });
    this.setSubmitting(false);

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      this.setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = routeFor([RoutePath.LOGIN]);
      }, 2000);
    }
  }
}
