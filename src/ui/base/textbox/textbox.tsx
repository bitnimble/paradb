'use client';

import classNames from 'classnames';
import { T } from 'ui/base/text/text';
import React, { useRef } from 'react';
import { useTextField } from 'react-aria';
import styles from './textbox.module.css';

type TextboxBorderColor = 'grey' | 'purple';

export type TextboxProps = {
  className?: string;
  required?: boolean;
  readOnly?: boolean;
  label?: string;
  tooltip?: string;
  placeholder?: string;
  borderColor?: TextboxBorderColor;
  borderWidth?: number;
  inputType?: 'text' | 'password' | 'area';
  error: string | undefined;
  value: string;
  onChange(value: string): void;
  onSubmit?(): void;
};

const borderColors: Record<TextboxBorderColor, string> = {
  ['grey']: styles.borderGrey,
  ['purple']: styles.borderPurple,
};

const TextboxInput = (props: TextboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const { labelProps, inputProps, errorMessageProps } = useTextField(
    {
      label: props.label,
      placeholder: props.placeholder,
      isReadOnly: props.readOnly,
      isRequired: props.required,
      value: props.value,
      onChange: props.onChange,
      type: props.inputType === 'password' ? 'password' : 'text',
      errorMessage: props.error,
      isInvalid: props.error != null && props.error.trim() !== '',
    },
    inputRef
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) =>
    props.onSubmit != null && e.key === 'Enter' && props.onSubmit();

  return (
    <>
      {props.label && (
        <span {...labelProps}>
          <T.Small color="grey">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </span>
      )}
      <div
        className={classNames(
          styles.textboxBorder,
          borderColors[props.borderColor || 'grey'],
          props.readOnly && styles.readOnly
        )}
        style={{ borderWidth: `${props.borderWidth || 1}px` }}
      >
        <input
          {...inputProps}
          ref={inputRef}
          className={styles.textbox}
          title={props.tooltip}
          style={{ cursor: props.readOnly ? 'not-allowed' : undefined }}
          onKeyDown={onKeyDown}
        />
      </div>
      {props.error != null && props.error.trim() !== '' ? (
        <T.Tiny color="red" {...{ id: errorMessageProps.id }}>
          {props.error}
        </T.Tiny>
      ) : undefined}
    </>
  );
};

const TextboxArea = (props: TextboxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { labelProps, inputProps, errorMessageProps } = useTextField(
    {
      label: props.label,
      placeholder: props.placeholder,
      isReadOnly: props.readOnly,
      isRequired: props.required,
      value: props.value,
      onChange: props.onChange,
      errorMessage: props.error,
      isInvalid: props.error != null && props.error.trim() !== '',
      inputElementType: 'textarea',
    },
    textareaRef
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) =>
    props.onSubmit != null && e.key === 'Enter' && props.onSubmit();

  return (
    <>
      {props.label && (
        <span {...labelProps}>
          <T.Small color="grey">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </span>
      )}
      <div
        className={classNames(
          styles.textboxBorder,
          borderColors[props.borderColor || 'grey'],
          props.readOnly && styles.readOnly
        )}
        style={{ borderWidth: `${props.borderWidth || 1}px` }}
      >
        <textarea
          {...inputProps}
          ref={textareaRef}
          className={styles.textbox}
          title={props.tooltip}
          style={{ cursor: props.readOnly ? 'not-allowed' : undefined }}
          onKeyDown={onKeyDown}
        />
      </div>
      {props.error != null && props.error.trim() !== '' ? (
        <T.Tiny color="red" {...{ id: errorMessageProps.id }}>
          {props.error}
        </T.Tiny>
      ) : undefined}
    </>
  );
};

export const Textbox = (props: TextboxProps) => {
  const isTextarea = props.inputType === 'area';

  return (
    <div
      className={classNames(props.className, styles.container, {
        [styles.errorContainer]: props.error != null,
      })}
    >
      {isTextarea ? <TextboxArea {...props} /> : <TextboxInput {...props} />}
    </div>
  );
};
