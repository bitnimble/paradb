import classNames from 'classnames';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import { searchIcon } from 'pages/paradb/base/ui/textbox/search_icon';
import React from 'react';
import styles from './textbox.css';

type TextboxBorderColor = 'grey' | 'purple';

export type TextboxProps = {
  className?: string,
  required?: boolean,
  label?: string,
  search?: boolean,
  placeholder?: string,
  borderColor?: TextboxBorderColor,
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

export const Textbox = observer((props: TextboxProps) => {
  const onChange = ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      props.onChange(target.value);
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) =>
      props.onSubmit != null && e.key === 'Enter' && props.onSubmit();
  const inputProps = {
    className: styles.textbox,
    type: props.inputType || 'text',
    value: props.value,
    placeholder: props.placeholder,
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
              {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
            </span>
        )}
        <div
            className={classNames(styles.textboxBorder, borderColors[props.borderColor || 'grey'])}
        >
          {props.search && searchIcon}
          {props.inputType === 'area'
              ? <textarea {...inputProps}/>
              : <input {...inputProps}/>}
        </div>

        {props.error != null && props.error.trim() !== ''
            ? (
                <T.Tiny color="red">{props.error}</T.Tiny>
            )
            : undefined}
      </div>
  );
});
