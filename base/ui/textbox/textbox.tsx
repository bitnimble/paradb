import classNames from 'classnames';
import { T } from 'pages/paradb/base/text/text';
import { searchIcon } from 'pages/paradb/base/ui/textbox/search_icon';
import React from 'react';
import styles from './textbox.css';

type TextboxBorderColor = 'grey' | 'purple';

export type TextboxProps = {
  className?: string,
  required?: boolean,
  readOnly?: boolean,
  label?: string,
  tooltip?: string,
  search?: boolean,
  placeholder?: string,
  borderColor?: TextboxBorderColor,
  borderWidth?: number,
  inputType?: 'text' | 'password' | 'area',
  error: string | undefined,
  value: string,
  onChange(value: string): void,
  onSubmit?(): void,
};

const borderColors: Record<TextboxBorderColor, string> = {
  ['grey']: styles.borderGrey,
  ['purple']: styles.borderPurple,
};

export const Textbox = (props: TextboxProps) => {
  const onChange = ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    props.onChange(target.value);
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = e =>
    props.onSubmit != null && e.key === 'Enter' && props.onSubmit();
  const inputProps = {
    className: styles.textbox,
    type: props.inputType || 'text',
    readOnly: props.readOnly,
    value: props.value,
    placeholder: props.placeholder,
    title: props.tooltip,
    style: { cursor: props.readOnly ? 'not-allowed' : undefined },
    onChange,
    onKeyDown,
  };
  return (
    <div
      className={classNames(props.className, styles.container, {
        [styles.errorContainer]: props.error != null,
      })}
    >
      {props.label && (
        <span>
          <T.Small color="grey">{props.label}</T.Small>
          {props
              .required
            ? <T.Small color="red">&nbsp;*</T.Small>
            : undefined}
        </span>
      )}
      <div
        className={classNames(
          styles.textboxBorder,
          borderColors[props.borderColor || 'grey'],
          props.readOnly && styles.readOnly,
        )}
        style={{ borderWidth: `${props.borderWidth || 1}px` }}
      >
        {props.search && searchIcon}
        {props.inputType === 'area' ? <textarea {...inputProps}/> : <input {...inputProps}/>}
      </div>

      {props.error != null && props.error.trim() !== ''
        ? <T.Tiny color="red">{props.error}</T.Tiny>
        : undefined}
    </div>
  );
};
