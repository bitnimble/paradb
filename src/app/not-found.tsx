import React from 'react';
import styles from './not-found.module.css';
import { T } from 'ui/base/text/text';

export default () => {
  return (
    <div className={styles.notfound}>
      <T.Medium>This page doesn't seem to exist.</T.Medium>
    </div>
  );
};
