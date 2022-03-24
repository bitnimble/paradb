import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './form_error.css';

export const FormError = observer(({ error }: { error: string | undefined }) =>
  error
    ? (
      <div className={styles.formError}>
        <T.Tiny color="red">{error}</T.Tiny>
      </div>
    )
    : null
);
