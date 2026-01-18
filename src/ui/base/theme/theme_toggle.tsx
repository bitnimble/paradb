'use client';

import React from 'react';
import { Button } from 'react-aria-components';
import { useTheme } from './theme_provider';
import styles from './theme_toggle.module.css';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onPress={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={styles.themeToggle}
    >
      {theme === 'light' ? '\u{1F319}' : '\u2600\uFE0F'}
    </Button>
  );
};
