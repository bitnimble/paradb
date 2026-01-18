'use client';

import { useToast, useToastRegion } from '@react-aria/toast';
import { ToastQueue, ToastState, useToastQueue } from '@react-stately/toast';
import classNames from 'classnames';
import React, { useRef } from 'react';
import { Button } from 'react-aria-components';
import { T } from 'ui/base/text/text';
import styles from './toast.module.css';

export type ToastIntent = 'default' | 'success' | 'error';

export type ToastContent = {
  message: string;
  intent?: ToastIntent;
};

const toastQueue = new ToastQueue<ToastContent>({ maxVisibleToasts: 5 });

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

type ToastProps = {
  toast: ToastState<ToastContent>['visibleToasts'][number];
  state: ToastState<ToastContent>;
};

function Toast({ toast, state }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { toastProps, contentProps, closeButtonProps } = useToast({ toast }, state, ref);

  const intent = toast.content.intent ?? 'default';

  return (
    <div {...toastProps} ref={ref} className={classNames(styles.toast, styles[intent])}>
      <div {...contentProps} className={styles.content}>
        <T.Medium>{toast.content.message}</T.Medium>
      </div>
      <Button
        {...closeButtonProps}
        className={styles.closeButton}
        onPress={() => state.close(toast.key)}
      >
        ✕
      </Button>
    </div>
  );
}

export function ToastContainer() {
  const state = useToastQueue(toastQueue);
  const ref = useRef<HTMLDivElement>(null);
  const { regionProps } = useToastRegion({}, state, ref);

  if (state.visibleToasts.length === 0) {
    return null;
  }

  return (
    <div {...regionProps} ref={ref} className={styles.toastRegion}>
      {state.visibleToasts.map((toast) => (
        <Toast key={toast.key} toast={toast} state={state} />
      ))}
    </div>
  );
}
