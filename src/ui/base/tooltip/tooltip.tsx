'use client';

import React from 'react';
import {
  Tooltip as AriaTooltip,
  TooltipTrigger,
  OverlayArrow,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';
import styles from './tooltip.module.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Delay in ms before showing the tooltip */
  delay?: number;
  /** The trigger element */
  children: React.ReactElement;
};

const positionToPlacement: Record<TooltipPosition, AriaTooltipProps['placement']> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
};

export const Tooltip = (props: TooltipProps) => {
  const { content, position = 'top', delay = 300, children } = props;

  return (
    <TooltipTrigger delay={delay}>
      {children}
      <AriaTooltip placement={positionToPlacement[position]} className={styles.tooltip}>
        <OverlayArrow className={styles.arrow}>
          <svg width={8} height={8} viewBox="0 0 8 8">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
};
