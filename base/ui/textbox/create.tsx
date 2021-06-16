import { observable } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import styles from './textbox.css';

export function createTextbox() {
  const value = observable.box('');
  const onChange: React.ChangeEventHandler<HTMLInputElement> = ({ target }) => value.set(target.value);
  return [
    observer(() => (
      <input className={styles.textbox} type="text" value={value.get()} onChange={onChange}/>
    )),
    value,
  ] as const;
}
