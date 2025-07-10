'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  // 获取初始值
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 设置值
  const setValue = useCallback((value) => {
    try {
      // 允许value是一个函数，以便支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // 移除值
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// 主题相关的专用 hook
export function useTheme() {
  const [theme, setTheme, removeTheme] = useLocalStorage('iTodo-theme', 'parchment');
  
  // 应用主题到页面
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return {
    theme,
    setTheme,
    removeTheme
  };
}

// 侧边栏状态的专用 hook
export function useSidebarState() {
  const [isOpen, setIsOpen, removeSidebarState] = useLocalStorage('iTodo-sidebar-open', false);
  
  return {
    isOpen,
    setIsOpen,
    removeSidebarState
  };
}

// 用户偏好设置的专用 hook
export function useUserPreferences() {
  const [preferences, setPreferences] = useLocalStorage('iTodo-preferences', {
    autoSave: true,
    showCompletedTasks: true,
    enableAnimations: true,
    enableNotifications: false,
    language: 'zh-CN'
  });

  const updatePreference = useCallback((key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setPreferences]);

  return {
    preferences,
    setPreferences,
    updatePreference
  };
} 