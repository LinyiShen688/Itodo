"use client"
import { createContext, useContext } from 'react';
import { useLocalStorage } from './useLocalStorage';

const AppSettingsContext = createContext();

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useLocalStorage('iTodo-settings', {
    defaultLayoutMode: 'FOUR', // 'FOUR' | 'SINGLE'
    defaultShowETA: true
  });

  const toggleDefaultLayoutMode = () => {
    setSettings(prev => ({
      ...prev,
      defaultLayoutMode: prev.defaultLayoutMode === 'FOUR' ? 'SINGLE' : 'FOUR'
    }));
  };

  const toggleDefaultShowETA = () => {
    setSettings(prev => ({
      ...prev,
      defaultShowETA: !prev.defaultShowETA
    }));
  };

  const value = {
    ...settings,
    setSettings,
    toggleDefaultLayoutMode,
    toggleDefaultShowETA
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
} 