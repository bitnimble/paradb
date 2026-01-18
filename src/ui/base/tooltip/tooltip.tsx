'use client';

import React from 'react';
import {
  Tooltip as AriaTooltip,
  TooltipTrigger,
  OverlayArrow,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';
import styles from './tooltip.module.css';
import { colors } from '../design_system/design_tokens';

export type TooltipProps = {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  placement?: AriaTooltipProps['placement'];
  /** Delay in ms before showing the tooltip */
  delay?: number;
  /** The trigger element */
  children: React.ReactElement;
};

export const Tooltip = (props: TooltipProps) => {
  const { content, placement = 'top', delay = 300, children } = props;

  return (
    <TooltipTrigger delay={delay}>
      {children}
      <AriaTooltip placement={placement} className={styles.tooltip}>
        <OverlayArrow className={styles.arrow}>
          <svg width={8} height={8} viewBox="0 0 8 8">
            <path strokeWidth="1" stroke={colors.accent} d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
};
