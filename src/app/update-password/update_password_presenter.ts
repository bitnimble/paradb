import { SupabaseClient } from '@supabase/supabase-js';
import { action, makeObservable, observable, runInAction } from 'mobx';
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
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly store: UpdatePasswordStore
  ) {
    super(store);
    makeObservable(this, {
      onChangePassword: action.bound,
    });
  }

  onChangePassword = (value: string) => (this.store.password = value);

  updatePassword = async () => {
    runInAction(() => this.clearErrors());
    const password = this.store.password;
    const errors = [
      ...this.checkPasswordRestrictionFields(['password', password]),
      ...this.checkRequiredFields(['password', password]),
    ];
    if (errors.length) {
      return;
    }

    runInAction(() => (this.store.submitting = true));
    const { error } = await this.supabase.auth.updateUser({ password });
    runInAction(() => (this.store.submitting = false));

    if (error) {
      this.pushErrors(['form'], error.message);
    } else {
      runInAction(() => (this.store.success = true));
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = routeFor([RoutePath.LOGIN]);
      }, 2000);
    }
  };
}
