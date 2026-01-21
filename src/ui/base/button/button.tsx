'use client';

import classNames from 'classnames';
import React from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { T } from 'ui/base/text/text';
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
  const isDisabled = disabled || loading || false;

  return link ? (
    <div
      className={classNames(className, styles.button, styleClassname[style], {
        [styles.disabled]: isDisabled,
      })}
    >
      <a
        className={styles.a}
        href={isDisabled ? '' : link}
        referrerPolicy="no-referrer"
        target="_blank"
      >
        <T.Medium>
          {style === 'success' ? '✔' : null} {children}
        </T.Medium>
      </a>
    </div>
  ) : (
    <AriaButton
      isDisabled={isDisabled}
      onPress={() => onClick?.()}
      className={classNames(className, styleClassname[style], styles.button, {
        [styles.disabled]: isDisabled,
        [styles.loading]: loading,
      })}
    >
      <T.Medium className={styles.buttonText}>
        {children}
        {style === 'success' ? ' ✔' : null}
      </T.Medium>
      {loading ? (
        <div className={classNames(loadingStyles.laBallPulse, loadingStyles.laSm)}>
          {/* These divs are styled via 'loading.css'. */}
          <div></div>
          <div></div>
          <div></div>
        </div>
      ) : undefined}
    </AriaButton>
  );
};
