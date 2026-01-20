import { action, makeObservable, observable } from 'mobx';
import { createClient } from 'services/session/supabase_client';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

type UpdatePasswordField = 'password' | 'confirmPassword' | 'form';

export class UpdatePasswordStore extends FormStore<UpdatePasswordField> {
  submitting = false;
  password = '';
  confirmPassword = '';
  success = false;

  constructor() {
    super();
    makeObservable(this, {
      password: observable.ref,
      confirmPassword: observable.ref,
      submitting: observable.ref,
      success: observable.ref,
    });
  }
}

export class UpdatePasswordPresenter extends FormPresenter<UpdatePasswordField> {
  constructor(private readonly store: UpdatePasswordStore) {
    super(store);
    makeObservable<typeof this, 'setSubmitting' | 'setSuccess'>(this, {
      onChangePassword: action.bound,
      onChangeConfirmPassword: action.bound,
      updatePassword: action.bound,
      setSubmitting: action.bound,
      setSuccess: action.bound,
    });
  }

  onChangePassword = (value: string) => (this.store.password = value);
  onChangeConfirmPassword = (value: string) => (this.store.confirmPassword = value);
  private setSubmitting = (value: boolean) => (this.store.submitting = value);
  private setSuccess = (value: boolean) => (this.store.success = value);

  async updatePassword() {
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
