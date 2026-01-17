'use client';

import React, { useRef } from 'react';
import { useToggleButton } from 'react-aria';
import { useToggleState } from 'react-stately';
import { useTheme } from './theme_provider';
import styles from './theme_toggle.module.css';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);

  const state = useToggleState({
    isSelected: theme === 'dark',
    onChange: toggleTheme,
  });

  const { buttonProps } = useToggleButton(
    {
      'aria-label': `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`,
    },
    state,
    ref
  );

  return (
    <button
      {...buttonProps}
      ref={ref}
      className={styles.themeToggle}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '\u{1F319}' : '\u2600\uFE0F'}
    </button>
  );
};
