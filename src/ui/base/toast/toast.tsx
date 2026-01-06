'use client';

import classNames from 'classnames';
import { observer } from 'mobx-react';
import { T } from 'ui/base/text/text';
import { Toast as ToastType, toastStore } from './toast_store';
import styles from './toast.module.css';

type ToastProps = {
  toast: ToastType;
  onClose: () => void;
};

const Toast = ({ toast, onClose }: ToastProps) => {
  return (
    <div className={classNames(styles.toast, styles[toast.intent])}>
      <T.Small color={toast.intent === 'default' ? 'black' : 'white'}>{toast.message}</T.Small>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
};

export const ToastContainer = observer(() => {
  const { toasts } = toastStore;

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => toastStore.remove(toast.id)} />
      ))}
    </div>
  );
});
