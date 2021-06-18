import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './button.css';

export type ButtonProps = {
  link?: string,
  onClick?(): void,
  children: React.ReactNode,
};

export const Button = (props: ButtonProps) => {
  const onClick = () => props.onClick?.();
  return props.link
    ? (
      <a href={props.link} referrerPolicy="no-referrer" target="_blank">
        <T.Medium color="purple">
          <div className={styles.button}>{props.children}</div>
        </T.Medium>
      </a>
    )
    : (
      <T.Medium color="purple">
        <button className={styles.button} onClick={onClick}>{props.children}</button>
      </T.Medium>
    );
};
