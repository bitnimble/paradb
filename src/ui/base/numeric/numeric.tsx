'use client';

import classNames from 'classnames';
import { observer } from 'mobx-react';
import React from 'react';
import { FieldError, Input, Label, NumberField } from 'react-aria-components';
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
    <NumberField
      className={classNames(props.className, styles.container, {
        [styles.errorContainer]: props.error != null,
      })}
      value={props.value}
      minValue={props.min}
      maxValue={props.max}
      isRequired={props.required}
      isInvalid={hasError}
      onChange={(value) => {
        if (!isNaN(value)) {
          props.onChange(value);
        }
      }}
    >
      {props.label && (
        <Label>
          <T.Small color="grey">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </Label>
      )}
      <Input className={styles.numeric} onKeyDown={onKeyDown} />
      {hasError ? (
        <FieldError>
          <T.Tiny color="red">{props.error}</T.Tiny>
        </FieldError>
      ) : undefined}
    </NumberField>
  );
});
