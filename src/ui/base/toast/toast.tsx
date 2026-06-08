'use client';

import { Toast } from '@base-ui/react/toast';
import classNames from 'classnames';
import { X } from 'lucide-react';
import { T } from 'ui/base/text/text';
import styles from './toast.module.css';

const intentStyles: Record<ToastIntent, string> = {
  [ToastIntent.DEFAULT]: styles.default,
  [ToastIntent.ERROR]: styles.error,
  [ToastIntent.SUCCESS]: styles.success,
};

export const enum ToastIntent {
  DEFAULT = 'default',
  SUCCESS = 'success',
  ERROR = 'error',
}

const toastManager = Toast.createToastManager();

/**
 * Shows a toast notification.
 * @param message The message to display
 * @param intent The visual intent: 'default' (purple border), 'success' (green), or 'error' (red)
 * @param timeout Duration in ms before auto-dismiss (default: 5000)
 */
export function showToast(
  message: string,
  intent: ToastIntent = ToastIntent.DEFAULT,
  timeout: number = 5000
): void {
  toastManager.add({ title: message, type: intent, timeout });
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const intent = (toast.type as ToastIntent | undefined) ?? ToastIntent.DEFAULT;
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={classNames(styles.toast, intentStyles[intent])}
      >
        <Toast.Title className={styles.content}>
          <T.Medium>{toast.title}</T.Medium>
        </Toast.Title>
        <Toast.Close className={styles.closeButton} aria-label="Close">
          <X />
        </Toast.Close>
      </Toast.Root>
    );
  });
}

export function ToastProvider() {
  return (
    <Toast.Provider toastManager={toastManager} limit={5}>
      <Toast.Viewport className={styles.toastRegion}>
        <ToastList />
      </Toast.Viewport>
    </Toast.Provider>
  );
}
