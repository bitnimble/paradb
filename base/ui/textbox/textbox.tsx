import classNames from 'classnames';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './textbox.css';

export type TextboxProps = {
  className?: string,
  required?: boolean,
  label?: string,
  inputType?: 'text' | 'password' | 'area',
  error: string | undefined,
  value: string,
  onChange(value: string): void,
  onSubmit?(): void,
};

export const Textbox = observer((props: TextboxProps) => {
  const onChange = ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChange(target.value);
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => props.onSubmit != null && e.key === 'Enter' && props.onSubmit();
  return (
    <div className={classNames(props.className, styles.container, { [styles.errorContainer]: props.error != null })}>
      {props.label && (
        <span>
          <T.Small color="grey">{props.label}</T.Small>
          {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
        </span>
      )}
      {props.inputType === 'area'
        ? <textarea className={styles.textbox} value={props.value} onChange={onChange} onKeyDown={onKeyDown}/>
        : <input className={styles.textbox} type={props.inputType || 'text'} value={props.value} onChange={onChange} onKeyDown={onKeyDown}/>
      }
      {props.error != null && props.error.trim() !== ''
        ? (
          <T.Tiny color="red">{props.error}</T.Tiny>
        )
        : undefined
      }
    </div>
  );
});
