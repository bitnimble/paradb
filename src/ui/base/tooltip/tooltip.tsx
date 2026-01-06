import classNames from 'classnames';
import React, { useState } from 'react';
import styles from './tooltip.module.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  className?: string;
  /** The content to display inside the tooltip */
  content: React.ReactNode;
  /** Where the tooltip appears relative to the trigger element */
  position?: TooltipPosition;
  /** The element that triggers the tooltip on hover */
  children: React.ReactNode;
};

const positionClassname: Record<TooltipPosition, string> = {
  top: styles.top,
  bottom: styles.bottom,
  left: styles.left,
  right: styles.right,
};

export const Tooltip = (props: TooltipProps) => {
  const { className, content, position = 'top', children } = props;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={classNames(className, styles.container)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={classNames(styles.tooltip, positionClassname[position])}>
          <div className={styles.content}>{content}</div>
        </div>
      )}
    </div>
  );
};
