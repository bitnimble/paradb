'use client';

import { ToastQueue } from '@react-stately/toast';
import classNames from 'classnames';
import React from 'react';
import {
  Button,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
} from 'react-aria-components';
import { T } from 'ui/base/text/text';
import styles from './toast.module.css';

export type ToastIntent = 'default' | 'success' | 'error';

export type ToastData = {
  message: string;
  intent?: ToastIntent;
};

const toastQueue = new ToastQueue<ToastData>({ maxVisibleToasts: 5 });

/**
 * Shows a toast notification.
 * @param message The message to display
 * @param intent The visual intent: 'default' (purple border), 'success' (green), or 'error' (red)
 * @param timeout Duration in ms before auto-dismiss (default: 5000)
 */
export function showToast(
  message: string,
  intent: ToastIntent = 'default',
  timeout: number = 5000
): void {
  toastQueue.add({ message, intent }, { timeout });
}

export function ToastContainer() {
  return (
    <ToastRegion queue={toastQueue} className={styles.toastRegion}>
      {({ toast }) => {
        const intent = toast.content.intent ?? 'default';
        return (
          <Toast toast={toast} className={classNames(styles.toast, styles[intent])}>
            <ToastContent className={styles.content}>
              <T.Medium>{toast.content.message}</T.Medium>
            </ToastContent>
            <Button
              className={styles.closeButton}
              onPress={() => toastQueue.close(toast.key)}
              slot="close"
            >
              ✕
            </Button>
          </Toast>
        );
      }}
    </ToastRegion>
  );
}
