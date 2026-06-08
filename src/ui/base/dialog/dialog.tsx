'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import React from 'react';
import styles from './dialog.module.css';

type TriggerProps = {
  onClick?: () => void;
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
};

type DialogProps = {
  Body: React.ReactNode;
  /** The trigger element. Its `onClick` is wired to open the dialog. */
  children: React.ReactElement<TriggerProps>;
};

export const Dialog = (props: DialogProps) => {
  const { Body, children } = props;
  const [open, setOpen] = React.useState(false);

  const trigger = React.cloneElement<TriggerProps>(children, {
    onClick: () => {
      children.props.onClick?.();
      setOpen(true);
    },
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
  });

  return (
    <>
      {trigger}
      <BaseDialog.Root open={open} onOpenChange={setOpen}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className={styles.dialogContainer} />
          <BaseDialog.Popup className={styles.dialog}>
            <BaseDialog.Close className={styles.close} aria-label="Close dialog">
              <X />
            </BaseDialog.Close>
            {Body}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </>
  );
};
