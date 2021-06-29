import classNames from 'classnames';
import React from 'react';
import styles from './text.css';

type TextStyle = 'regular' | 'title' | 'monospace';
type TextWeight = 'regular' | 'semibold' | 'bold' | 'extrabold' | 'black';
type TextColor = 'black' | 'red' | 'white' | 'grey' | 'purple';

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

const colorMap: Record<TextColor, string> = {
  'black': styles.textColorBlack,
  'red': styles.textColorRed,
  'white': styles.textColorWhite,
  'grey': styles.textColorGrey,
  'purple': styles.textColorPurple,
}

export type TextProps = {
  className?: string;
  children: React.ReactNode;
  color?: TextColor;
  style?: TextStyle;
  weight?: TextWeight;
}

function createTextClass(className: string) {
  return ({ className: classNameProp, children, color = 'black', style = 'regular', weight = 'regular' }: TextProps) => (
    <span className={classNames(classNameProp, styles.text, className, styleMap[style], weightMap[weight], colorMap[color])}>{children}</span>
  );
}

export namespace T {
  export const Tiny = createTextClass(styles.tiny);
  export const Small = createTextClass(styles.small);
  export const Medium = createTextClass(styles.medium);
  export const Large = createTextClass(styles.large);
  export const ExtraLarge = createTextClass(styles.extraLarge);
  export const Custom = createTextClass(styles.custom);
}
