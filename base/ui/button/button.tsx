import classNames from 'classnames';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './button.css';

export type ButtonProps = {
  className?: string,
  link?: string,
  disabled?: boolean,
  onClick?(): void,
  children: React.ReactNode,
};

export const Button = (props: ButtonProps) => {
  const onClick = () => props.onClick?.();
  return props.link
    ? (
      <a className={props.className || ''} href={props.link} referrerPolicy="no-referrer" target="_blank">
        <T.Medium color="purple">
          <div className={styles.button}>{props.children}</div>
        </T.Medium>
      </a>
    )
    : (
      <T.Medium className={props.className || ''} color="purple">
        <button disabled={props.disabled || false} className={classNames(styles.button, { [styles.disabled]: props.disabled })} onClick={onClick}>{props.children}</button>
      </T.Medium>
    );
};
