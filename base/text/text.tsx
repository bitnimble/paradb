import classNames from 'classnames';
import React from 'react';
import styles from './text.css';

type TextStyle = 'regular' | 'title' | 'monospace';
type TextWeight = 'regular' | 'semibold' | 'bold' | 'extrabold' | 'black';

const styleMap: Record<TextStyle, string> = {
  'regular': styles.styleRegular,
  'title': styles.styleTitle,
  'monospace': styles.styleMonospace,
};

const weightMap: Record<TextWeight, string> = {
  'regular': styles.weightRegular,
  'semibold': styles.weightSemibold,
  'bold': styles.weightBold,
  'extrabold': styles.weightExtrabold,
  'black': styles.weightBlack,
};

export type TextProps = {
  children: React.ReactNode;
  color?: 'black' | 'red' | 'white' | 'grey';
  style?: TextStyle;
  weight?: TextWeight;
}

function createTextClass(className: string) {
  return ({ children, color, style = 'regular', weight = 'regular' }: TextProps) => (
    <span className={classNames(styles.text, className, styleMap[style], weightMap[weight])} style={{ color }}>{children}</span>
  );
}

export namespace T {
  export const Small = createTextClass(styles.small);
  export const Medium = createTextClass(styles.medium);
  export const Large = createTextClass(styles.large);
  export const ExtraLarge = createTextClass(styles.extraLarge);
  export const Custom = createTextClass(styles.custom);
}
