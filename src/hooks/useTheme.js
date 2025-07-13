'use client';

import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('iTodo-theme', 'parchment');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // For the default theme, we don't want a data-theme attribute
    if (theme === 'parchment') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    themes: ['parchment', 'dark-blue', 'forest-green', 'morning-gold'],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 