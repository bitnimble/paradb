import classNames from 'classnames';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './button.css';
import loadingStyles from './loading.css';

export type ButtonProps = {
  className?: string,
  style?: 'regular' | 'error',
  link?: string,
  loading?: boolean,
  disabled?: boolean,
  onClick?(): void,
  children: React.ReactNode,
};

const styleClassname: Record<'regular' | 'error', string> = {
  ['regular']: styles.regular,
  ['error']: styles.error,
};

export const Button = (props: ButtonProps) => {
  const {
    className,
    style = 'regular',
    link,
    loading,
    disabled,
    onClick,
    children,
  } = props;

  const _onClick = () => onClick?.();
  return link
      ? (
          <div
              className={classNames(className, styles.button, styleClassname[style], {
                [styles.disabled]: disabled || loading,
              })}
          >
            <a
                className={styles.a}
                href={(disabled || loading) ? '' : link}
                referrerPolicy="no-referrer"
                target="_blank"
            >
              <T.Medium>
                {children}
              </T.Medium>
            </a>
          </div>
      )
      : (
          <button
              disabled={disabled || loading || false}
              className={classNames(className, styleClassname[style], styles.button, {
                [styles.disabled]: disabled || loading,
              })}
              onClick={_onClick}
          >
            <T.Medium>
              {children}
              {loading
                  ? (
                      <div
                          className={classNames(
                              loadingStyles.laBallPulse,
                              loadingStyles.laSm,
                              styles.loadingSpinner,
                          )}
                      >
                        {/* These divs are styled via 'loading.css'. */}
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                  )
                  : undefined}
            </T.Medium>
          </button>
      );
};
