'use client';

import { useEffect } from 'react';
import Toast from './Toast';
import { useToastList, useToastActions, useToast } from '@/hooks/useToast';

export default function ToastContainer() {
  const toasts = useToastList();
  const { removeToast } = useToastActions();
  const toast = useToast();

  // 监听全局 toast 事件
  useEffect(() => {
    const handleToastEvent = (event) => {
      const { type, message, ...options } = event.detail;
      toast[type]?.(message, options) || toast.info(message, options);
    };

    window.addEventListener('toast', handleToastEvent);
    return () => window.removeEventListener('toast', handleToastEvent);
  }, []); // 移除 toast 依赖，避免无限循环

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-[9999] p-4 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            showProgress={toast.showProgress}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}