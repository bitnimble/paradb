import classNames from 'classnames';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './textbox.css';

export type TextboxProps = {
  required?: boolean,
  label?: string,
  inputType?: 'text' | 'password',
  error: string | undefined;
  onSubmit?(): void,
};

export function createTextbox() {
  const value = observable.box('');
  const onChange: React.ChangeEventHandler<HTMLInputElement> = ({ target }) => value.set(target.value);
  return [
    observer((props: TextboxProps) => {
      const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => props.onSubmit != null && e.key === 'Enter' && props.onSubmit();
      return (
        <div className={classNames(styles.container, { [styles.errorContainer]: props.error != null })}>
          {props.label && (
            <span className={styles.label}>
              <T.Custom color="grey">{props.label}</T.Custom>
              {props.required ? <T.Small color="red">&nbsp;*</T.Small> : undefined}
            </span>
          )}
          <input className={styles.textbox} type={props.inputType || 'text'} value={value.get()} onChange={onChange} onKeyDown={onKeyDown}/>
          {props.error != null && props.error.trim() !== ''
            ? (
              <T.Tiny color="red">{props.error}</T.Tiny>
            )
            : undefined
          }
        </div>
      );
    }),
    value,
  ] as const;
}
