import { SupabaseClient } from '@supabase/supabase-js';
import { action, makeObservable, observable, runInAction } from 'mobx';
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
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly store: ResetPasswordStore
  ) {
    super(store);
    makeObservable(this, {
      onChangeEmail: action.bound,
    });
  }

  onChangeEmail = (value: string) => (this.store.email = value);

  requestReset = async () => {
    runInAction(() => this.clearErrors());
    const email = this.store.email;
    const errors = [
      ...this.checkEmailFields(['email', email]),
      ...this.checkRequiredFields(['email', email]),
    ];
    if (errors.length) {
      return;
    }

    runInAction(() => (this.store.submitting = true));
    const redirectTo = `${window.location.origin}${routeFor([RoutePath.UPDATE_PASSWORD])}`;
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, { redirectTo });
    runInAction(() => (this.store.submitting = false));

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      runInAction(() => (this.store.success = true));
    }
  };
}
