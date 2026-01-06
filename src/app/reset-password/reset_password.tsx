import { observer } from 'mobx-react';
import { ResetPasswordField } from './reset_password_presenter';
import { FormError } from 'ui/base/form/form_error';
import { RouteLink } from 'ui/base/text/link';
import { Button } from 'ui/base/button/button';
import { Textbox } from 'ui/base/textbox/textbox';
import styles from './reset_password.module.css';
import { routeFor, RoutePath } from 'utils/routes';

type ResetPasswordProps = {
  email: string;
  submitting: boolean;
  success: boolean;
  errors: Map<ResetPasswordField, string>;
  onChangeEmail(value: string): void;
  requestReset(): void;
};

export const ResetPassword = observer(
  ({ email, submitting, success, errors, onChangeEmail, requestReset }: ResetPasswordProps) => {
    if (success) {
      return (
        <div className={styles.resetPassword}>
          <p>Check your email for a password reset link.</p>
          <RouteLink href={routeFor([RoutePath.LOGIN])}>Back to login</RouteLink>
        </div>
      );
    }

    return (
      <div className={styles.resetPassword}>
        <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
        <Textbox
          value={email}
          onChange={onChangeEmail}
          label="Email"
          onSubmit={requestReset}
          error={errors.get('email')}
        />
        <div className={styles.submitContainer}>
          <RouteLink href={routeFor([RoutePath.LOGIN])}>Back to login</RouteLink>
          <Button loading={submitting} onClick={requestReset}>
            Send reset link
          </Button>
        </div>
        <FormError error={errors.get('form')} />
      </div>
    );
  }
);
