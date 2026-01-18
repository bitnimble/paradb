'use client';

import React from 'react';
import { Dialog as AriaDialog, Button, Modal, ModalOverlay } from 'react-aria-components';
import styles from './dialog.module.css';

type DialogProps = {
  Body: React.ComponentType;
  onClose: () => void;
};

export const Dialog = (props: DialogProps) => {
  const { onClose, Body } = props;

  return (
    <ModalOverlay
      className={styles.dialogContainer}
      isDismissable
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <Modal>
        <AriaDialog className={styles.dialog}>
          <Button className={styles.close} aria-label="Close dialog" onPress={onClose}>
            ✖
          </Button>
          <Body />
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
};
