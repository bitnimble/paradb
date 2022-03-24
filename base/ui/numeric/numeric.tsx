import classNames from 'classnames';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './numeric.css';

export type NumericProps = {
  className?: string,
  required?: boolean,
  label?: string,
  error: string | undefined,
  value: number,
  min?: number,
  max?: number,
  onChange(value: number): void,
  onSubmit?(): void,
};

export const Numeric = observer((props: NumericProps) => {
  const onChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.valueAsNumber;
    if (value >= (props.min ?? Number.MIN_VALUE) && value <= (props.max ?? Number.MAX_VALUE)) {
      props.onChange(value);
    }
  };
  const onKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) =>
    props.onSubmit != null && key === 'Enter' && props.onSubmit();
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
      <input
        type="number"
        className={styles.numeric}
        value={props.value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {props.error != null && props.error.trim() !== ''
        ? <T.Tiny color="red">{props.error}</T.Tiny>
        : undefined}
    </div>
  );
});
