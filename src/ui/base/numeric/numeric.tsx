'use client';

import classNames from 'classnames';
import { observer } from 'mobx-react';
import { T } from 'ui/base/text/text';
import React, { useRef } from 'react';
import { useNumberField } from 'react-aria';
import { useNumberFieldState } from 'react-stately';
import styles from './numeric.module.css';

export type NumericProps = {
  className?: string;
  required?: boolean;
  label?: string;
  error: string | undefined;
  value: number;
  min?: number;
  max?: number;
  onChange(value: number): void;
  onSubmit?(): void;
};

export const Numeric = observer((props: NumericProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const numberFieldProps = {
    label: props.label,
    value: props.value,
    minValue: props.min,
    maxValue: props.max,
    isRequired: props.required,
    errorMessage: props.error,
    isInvalid: props.error != null && props.error.trim() !== '',
    onChange: (value: number) => {
      if (!isNaN(value)) {
        props.onChange(value);
      }
    },
  };

  const state = useNumberFieldState({
    ...numberFieldProps,
    locale: 'en-US',
  });

  const { labelProps, inputProps, errorMessageProps } = useNumberField(
    numberFieldProps,
    state,
    inputRef
  );

  const onKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) =>
    props.onSubmit != null && key === 'Enter' && props.onSubmit();

  return (
    <div
      className={classNames(props.className, styles.container, {
        [styles.errorContainer]: props.error != null,
      })}
    >
      {props.label && (
        <span {...labelProps}>
          <T.Small color="grey">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </span>
      )}
      <input {...inputProps} ref={inputRef} className={styles.numeric} onKeyDown={onKeyDown} />
      {props.error != null && props.error.trim() !== '' ? (
        <T.Tiny color="red" {...{ id: errorMessageProps.id }}>
          {props.error}
        </T.Tiny>
      ) : undefined}
    </div>
  );
});
