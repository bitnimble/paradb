'use client';

import { NumberField } from '@base-ui/react/number-field';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { T } from 'ui/base/text/text';
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
  const onKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) =>
    props.onSubmit != null && key === 'Enter' && props.onSubmit();

  const hasError = props.error != null && props.error.trim() !== '';

  return (
    <NumberField.Root
      className={classNames(props.className, styles.container, {
        [styles.errorContainer]: props.error != null,
      })}
      value={props.value}
      min={props.min}
      max={props.max}
      required={props.required}
      onValueChange={(value) => {
        if (value != null && !isNaN(value)) {
          props.onChange(value);
        }
      }}
    >
      {props.label && (
        <label>
          <T.Small color="fgSecondary">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </label>
      )}
      <NumberField.Input className={styles.numeric} onKeyDown={onKeyDown} />
      {hasError ? <T.Tiny color="red">{props.error}</T.Tiny> : undefined}
    </NumberField.Root>
  );
});
