'use client';

import React, { useRef } from 'react';
import { useDialog, useModalOverlay, useButton, Overlay } from 'react-aria';
import styles from './dialog.module.css';

type DialogProps = {
  Body: React.ComponentType;
  onClose: () => void;
};

export const Dialog = (props: DialogProps) => {
  const { onClose, Body } = props;
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Create a state that's always "open" since this component is only mounted when shown
  const state = {
    isOpen: true,
    close: onClose,
    open: () => {},
    toggle: () => {},
    setOpen: () => {},
  };

  const { modalProps, underlayProps } = useModalOverlay({ isDismissable: true }, state, overlayRef);

  const { dialogProps } = useDialog({ role: 'dialog' }, dialogRef);

  const { buttonProps: closeButtonProps } = useButton(
    {
      'aria-label': 'Close dialog',
      onPress: onClose,
    },
    closeButtonRef
  );

  return (
    <Overlay>
      <div className={styles.dialogContainer} {...underlayProps}>
        <div {...modalProps} ref={overlayRef}>
          <div {...dialogProps} ref={dialogRef} className={styles.dialog}>
            <button {...closeButtonProps} ref={closeButtonRef} className={styles.close}>
              ✖
            </button>
            <Body />
          </div>
        </div>
      </div>
    </Overlay>
  );
};
