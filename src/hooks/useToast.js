'use client';

import { useMemo } from 'react';
import { create } from 'zustand';

// Toast Store
const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 3000,
      showProgress: true,
      ...toast
    };
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }));
    
    return id;
  },
  
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  clearAllToasts: () => {
    set({ toasts: [] });
  }
}));

// Toast Hook
export function useToast() {
  const addToast = useToastStore(state => state.addToast);
  const removeToast = useToastStore(state => state.removeToast);
  const clearAllToasts = useToastStore(state => state.clearAllToasts);
  
  const toast = useMemo(() => ({
    success: (message, options = {}) => {
      return addToast({
        message,
        type: 'success',
        ...options
      });
    },
    
    error: (message, options = {}) => {
      return addToast({
        message,
        type: 'error',
        duration: 5000, // 错误提示显示更久
        ...options
      });
    },
    
    warning: (message, options = {}) => {
      return addToast({
        message,
        type: 'warning',
        duration: 4000,
        ...options
      });
    },
    
    info: (message, options = {}) => {
      return addToast({
        message,
        type: 'info',
        ...options
      });
    },
    
    // 自定义 toast
    custom: (options) => {
      return addToast(options);
    },
    
    // 移除特定 toast
    dismiss: (id) => {
      removeToast(id);
    },
    
    // 清空所有 toast
    clear: () => {
      clearAllToasts();
    }
  }), [addToast, removeToast, clearAllToasts]);
  
  return toast;
}

// Toast Store Hook (for components)
export function useToastList() {
  return useToastStore(state => state.toasts);
}

export function useToastActions() {
  const removeToast = useToastStore(state => state.removeToast);
  const clearAllToasts = useToastStore(state => state.clearAllToasts);
  
  return { removeToast, clearAllToasts };
}