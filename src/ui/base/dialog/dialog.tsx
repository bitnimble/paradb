import React from 'react';
import styles from './dialog.module.css';

export class Dialog extends React.Component<{ Body: React.ComponentType; onClose: () => void }> {
  render() {
    const { onClose, Body } = this.props;
    return (
      <div className={styles.dialogContainer}>
        <div className={styles.dialog}>
          <button className={styles.close} onClick={onClose}>
            ✖
          </button>
          <Body />
        </div>
      </div>
    );
  }
}
