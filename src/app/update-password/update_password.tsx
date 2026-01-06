import { observer } from 'mobx-react';
import { UpdatePasswordField } from './update_password_presenter';
import { FormError } from 'ui/base/form/form_error';
import { Button } from 'ui/base/button/button';
import { Textbox } from 'ui/base/textbox/textbox';
import styles from './update_password.module.css';

type UpdatePasswordProps = {
  password: string;
  submitting: boolean;
  success: boolean;
  errors: Map<UpdatePasswordField, string>;
  onChangePassword(value: string): void;
  updatePassword(): void;
};

export const UpdatePassword = observer(
  ({
    password,
    submitting,
    success,
    errors,
    onChangePassword,
    updatePassword,
  }: UpdatePasswordProps) => {
    if (success) {
      return (
        <div className={styles.updatePassword}>
          <p>Your password has been updated. Redirecting to login...</p>
        </div>
      );
    }

    return (
      <div className={styles.updatePassword}>
        <p>Enter your new password.</p>
        <Textbox
          value={password}
          onChange={onChangePassword}
          inputType="password"
          label="New password"
          onSubmit={updatePassword}
          error={errors.get('password')}
        />
        <div className={styles.submitContainer}>
          <Button loading={submitting} onClick={updatePassword}>
            Update password
          </Button>
        </div>
        <FormError error={errors.get('form')} />
      </div>
    );
  }
);
