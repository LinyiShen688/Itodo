'use client';

import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('iTodo-theme', 'minimal');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 为所有主题设置 data-theme 属性
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    themes: ['minimal', 'parchment', 'dark-blue', 'forest-green'],
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