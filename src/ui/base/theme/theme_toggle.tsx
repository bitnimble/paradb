'use client';

import { Button } from '@base-ui/react/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme_provider';
import styles from './theme_toggle.module.css';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={styles.themeToggle}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </Button>
  );
};
