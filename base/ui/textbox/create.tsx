import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './textbox.css';

export type TextboxProps = {
  label?: string,
  inputType?: 'text' | 'password',
};

export function createTextbox() {
  const value = observable.box('');
  const onChange: React.ChangeEventHandler<HTMLInputElement> = ({ target }) => value.set(target.value);
  return [
    observer((props: TextboxProps) => (
      <div className={styles.container}>
        {props.label && <span className={styles.label}><T.Custom color="grey">{props.label}</T.Custom></span>}
        <input className={styles.textbox} type={props.inputType || 'text'} value={value.get()} onChange={onChange}/>
      </div>
    )),
    value,
  ] as const;
}
