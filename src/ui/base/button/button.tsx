'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import React from 'react';
import { T } from 'ui/base/text/text';
import styles from './button.module.css';
import loadingStyles from './loading.module.css';

type ButtonStyle = 'regular' | 'active' | 'error' | 'success';

export type ButtonProps = React.AriaAttributes & {
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
  const {
    className,
    style = 'regular',
    link,
    loading,
    disabled,
    onClick,
    children,
    ...rest
  } = props;
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
          {style === 'success' ? <Check className={styles.successCheck} /> : null} {children}
        </T.Medium>
      </a>
    </div>
  ) : (
    <BaseButton
      {...rest}
      disabled={isDisabled}
      onClick={() => onClick?.()}
      className={classNames(className, styleClassname[style], styles.button, {
        [styles.disabled]: isDisabled,
        [styles.loading]: loading,
      })}
    >
      <T.Medium className={styles.buttonText}>
        {children}
        {style === 'success' ? <Check className={styles.successCheck} /> : null}
      </T.Medium>
      {loading ? (
        <div className={classNames(loadingStyles.laBallPulse, loadingStyles.laSm)}>
          {/* These divs are styled via 'loading.css'. */}
          <div></div>
          <div></div>
          <div></div>
        </div>
      ) : undefined}
    </BaseButton>
  );
};
