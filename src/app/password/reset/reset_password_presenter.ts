import { action, observable } from 'mobx';
import { createClient } from 'services/session/supabase_client';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

type ResetPasswordField = 'email' | 'form';

export class ResetPasswordStore extends FormStore<ResetPasswordField> {
  @observable accessor submitting = false;
  @observable accessor email = '';
  @observable accessor success = false;
}

export class ResetPasswordPresenter extends FormPresenter<ResetPasswordField> {
  constructor(private readonly store: ResetPasswordStore) {
    super(store);
  }

  @action.bound onChangeEmail(value: string) {
    this.store.email = value;
  }
  @action private setSubmitting(value: boolean) {
    this.store.submitting = value;
  }
  @action private setSuccess(value: boolean) {
    this.store.success = value;
  }

  @action.bound async onRequestReset() {
    this.clearErrors();
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
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    this.setSubmitting(false);

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      this.setSuccess(true);
    }
  }
}
