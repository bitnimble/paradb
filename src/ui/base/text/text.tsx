import classNames from 'classnames';
import React from 'react';
import styles from './text.module.css';

type TextStyle = 'regular' | 'title' | 'monospace' | 'code';
type TextWeight = 'regular' | 'semibold' | 'bold' | 'extrabold' | 'black';
type TextColor = 'red' | 'white' | 'grey' | 'purple' | 'auto';
type TextDisplay = 'inline' | 'block';

const styleMap: Record<TextStyle, string> = {
  'regular': styles.styleRegular,
  'title': styles.styleTitle,
  'monospace': styles.styleMonospace,
  'code': styles.styleCode,
};

const weightMap: Record<TextWeight, string> = {
  'regular': styles.weightRegular,
  'semibold': styles.weightSemibold,
  'bold': styles.weightBold,
  'extrabold': styles.weightExtrabold,
  'black': styles.weightBlack,
};

const colorMap: Record<TextColor, string> = {
  'red': styles.textColorRed,
  'white': styles.textColorWhite,
  'grey': styles.textColorGrey,
  'purple': styles.textColorPurple,
  'auto': styles.textColorAuto,
};

const displayMap: Record<TextDisplay, string> = {
  'block': styles.displayBlock,
  'inline': styles.displayInline,
};

export type TextProps = {
  className?: string;
  children: React.ReactNode;
  color?: TextColor;
  style?: TextStyle;
  weight?: TextWeight;
  display?: TextDisplay;
  ComponentOverride?: React.ComponentType<React.PropsWithChildren<{ className: string }>>;
};

function createTextClass(className: string) {
  return ({
    className: classNameProp,
    color,
    children,
    style = 'regular',
    weight = 'regular',
    display = 'inline',
    ComponentOverride,
  }: TextProps) => {
    const classname = classNames(
      classNameProp,
      styles.text,
      className,
      styleMap[style],
      weightMap[weight],
      color && colorMap[color],
      displayMap[display]
    );
    if (ComponentOverride) {
      return <ComponentOverride className={classname}>{children}</ComponentOverride>;
    } else if (display === 'block') {
      return <p className={classname}>{children}</p>;
    }
    return <span className={classname}>{children}</span>;
  };
}

export namespace T {
  export const Tiny = createTextClass(styles.tiny);
  export const Small = createTextClass(styles.small);
  export const Medium = createTextClass(styles.medium);
  export const Large = createTextClass(styles.large);
  export const ExtraLarge = createTextClass(styles.extraLarge);
  export const Custom = createTextClass(styles.custom);
}
