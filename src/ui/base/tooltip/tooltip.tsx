'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import React from 'react';
import { colors } from '../design_system/design_tokens';
import { gridBaseline } from '../metrics/metrics';
import styles from './tooltip.module.css';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  placement?: TooltipPlacement;
  /** Delay in ms before showing the tooltip */
  delay?: number;
  /** The trigger element */
  children: React.ReactElement;
};

export const Tooltip = (props: TooltipProps) => {
  const { content, placement = 'top', delay = 300, children } = props;

  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={placement} sideOffset={gridBaseline}>
            <BaseTooltip.Popup className={styles.tooltip}>
              <BaseTooltip.Arrow className={styles.arrow}>
                <svg width={8} height={8} viewBox="0 0 8 8">
                  <path strokeWidth="1" stroke={colors.accent} d="M0 0 L4 4 L8 0" />
                </svg>
              </BaseTooltip.Arrow>
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};
