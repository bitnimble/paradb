import classNames from 'classnames';
import { T } from 'ui/base/text/text';
import React from 'react';
import styles from './button.module.css';
import loadingStyles from './loading.module.css';

type ButtonStyle = 'regular' | 'active' | 'error' | 'success';

export type ButtonProps = {
  className?: string;
  style?: ButtonStyle;
  link?: string;
  /** `loading` implies `disabled` as well */
  loading?: boolean;
  disabled?: boolean;
  onClick?(): void;
  children: React.ReactNode;
};

const styleClassname: Record<ButtonStyle, string> = {
  ['regular']: styles.regular,
  ['active']: styles.active,
  ['error']: styles.error,
  ['success']: styles.success,
};

export const Button = (props: ButtonProps) => {
  const { className, style = 'regular', link, loading, disabled, onClick, children } = props;

  const _onClick = () => onClick?.();
  return link ? (
    <div
      className={classNames(className, styles.button, styleClassname[style], {
        [styles.disabled]: disabled || loading,
      })}
    >
      <a
        className={styles.a}
        href={disabled || loading ? '' : link}
        referrerPolicy="no-referrer"
        target="_blank"
      >
        <T.Medium>
          {style === 'success' ? '✔' : null} {children}
        </T.Medium>
      </a>
    </div>
  ) : (
    <button
      disabled={disabled || loading || false}
      className={classNames(className, styleClassname[style], styles.button, {
        [styles.disabled]: disabled || loading,
      })}
      onClick={_onClick}
    >
      <T.Medium>{children}</T.Medium>
      <div className={styles.trailingIcon}>
        {style === 'success' ? ' ✔' : null}
        {loading ? (
          <div className={classNames(loadingStyles.laBallPulse, loadingStyles.laSm)}>
            {/* These divs are styled via 'loading.css'. */}
            <div></div>
            <div></div>
            <div></div>
          </div>
        ) : undefined}
      </div>
    </button>
  );
};
