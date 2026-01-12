'use client';

import React, { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const savedTheme = localStorage.getItem('paradb-theme') as Theme | null;
  if (savedTheme) {
    return savedTheme;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

let currentTheme: Theme = 'light';
const listeners = new Set<() => void>();

function subscribeToTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getTheme() {
  return currentTheme;
}

function setTheme(theme: Theme) {
  currentTheme = theme;
  if (typeof window !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('paradb-theme', theme);
  }
  listeners.forEach((listener) => listener());
}

// Initialize theme on client side
if (typeof window !== 'undefined') {
  currentTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    (): Theme => 'light' // Server snapshot
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
