import classNames from 'classnames';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './button.css';
import loadingStyles from './loading.css';

export type ButtonProps = {
  className?: string,
  link?: string,
  loading?: boolean,
  disabled?: boolean,
  onClick?(): void,
  children: React.ReactNode,
};

export const Button = (props: ButtonProps) => {
  const onClick = () => props.onClick?.();
  return props.link
    ? (
      <a className={classNames(props.className || '', styles.a)} href={(props.disabled || props.loading) ? '' : props.link} referrerPolicy="no-referrer" target="_blank">
        <T.Medium color="purple">
          <div className={classNames(styles.button, { [styles.disabled]: props.disabled || props.loading })}>{props.children}</div>
        </T.Medium>
      </a>
    )
    : (
      <T.Medium className={props.className || ''} color="purple">
        <button disabled={props.disabled || props.loading || false} className={classNames(styles.button, { [styles.disabled]: props.disabled || props.loading })} onClick={onClick}>
          {props.children}
          {props.loading
            ? (
              <div className={classNames(loadingStyles.laBallPulse, loadingStyles.laSm, styles.loadingSpinner)}>
                <div></div>
                <div></div>
                <div></div>
              </div>
            )
            : undefined
          }
        </button>
      </T.Medium>
    );
};
