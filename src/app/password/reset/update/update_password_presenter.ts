import { action, observable } from 'mobx';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { createClient } from 'ui/session/supabase_client';
import { RoutePath, routeFor } from 'utils/routes';

type UpdatePasswordField = 'password' | 'confirmPassword' | 'form';

export class UpdatePasswordStore extends FormStore<UpdatePasswordField> {
  @observable accessor submitting = false;
  @observable accessor password = '';
  @observable accessor confirmPassword = '';
  @observable accessor success = false;
}

export class UpdatePasswordPresenter extends FormPresenter<UpdatePasswordField> {
  constructor(private readonly store: UpdatePasswordStore) {
    super(store);
  }

  @action.bound onChangePassword(value: string) {
    this.store.password = value;
  }
  @action.bound onChangeConfirmPassword(value: string) {
    this.store.confirmPassword = value;
  }
  @action private setSubmitting(value: boolean) {
    this.store.submitting = value;
  }
  @action private setSuccess(value: boolean) {
    this.store.success = value;
  }

  @action.bound async onUpdatePassword() {
    this.clearErrors();
    const password = this.store.password;
    const confirmPassword = this.store.confirmPassword;
    const errors = [
      ...this.checkPasswordRestrictionFields(['password', password]),
      ...this.checkRequiredFields(['password', password], ['confirmPassword', confirmPassword]),
      ...this.checkPasswordConfirmFields(
        ['password', password],
        ['confirmPassword', confirmPassword]
      ),
    ];
    if (errors.length) {
      return;
    }

    this.setSubmitting(true);
    const { error } = await createClient().auth.updateUser({ password });
    this.setSubmitting(false);

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      this.setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = routeFor([RoutePath.MAP_LIST]);
      }, 2000);
    }
  }
}
