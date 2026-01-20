'use client';

import React from 'react';
import {
  Dialog as AriaDialog,
  Button,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from 'react-aria-components';
import styles from './dialog.module.css';

type DialogProps = {
  Body: React.ReactNode;
  children: React.ReactNode;
};

export const Dialog = (props: DialogProps) => {
  const { Body, children } = props;

  return (
    <DialogTrigger>
      {children}
      <ModalOverlay className={styles.dialogContainer} isDismissable>
        <Modal>
          <AriaDialog className={styles.dialog}>
            <Button className={styles.close} aria-label="Close dialog" slot="close">
              ✖
            </Button>
            {Body}
          </AriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};
