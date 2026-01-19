import { action, makeObservable, observable, runInAction } from 'mobx';
import { createClient } from 'services/session/supabase_client';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

export type ResetPasswordField = 'email' | 'form';

export class ResetPasswordStore extends FormStore<ResetPasswordField> {
  submitting = false;
  email = '';
  success = false;

  constructor() {
    super();
    makeObservable(this, {
      email: observable.ref,
      submitting: observable.ref,
      success: observable.ref,
    });
  }
}

export class ResetPasswordPresenter extends FormPresenter<ResetPasswordField> {
  private readonly supabase = createClient();

  constructor(private readonly store: ResetPasswordStore) {
    super(store);
    makeObservable(this, {
      onChangeEmail: action.bound,
      requestReset: action.bound,
    });
  }

  onChangeEmail = (value: string) => (this.store.email = value);
  private setSubmitting = action((value: boolean) => (this.store.submitting = value));
  private setSuccess = action((value: boolean) => (this.store.success = value));

  async requestReset() {
    runInAction(() => this.clearErrors());
    const email = this.store.email;
    const errors = [
      ...this.checkEmailFields(['email', email]),
      ...this.checkRequiredFields(['email', email]),
    ];
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL}${routeFor([RoutePath.PASSWORD, RoutePath.RESET, RoutePath.UPDATE])}`;
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, { redirectTo });
    this.setSubmitting(false);

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      this.setSuccess(true);
    }
  }
}
