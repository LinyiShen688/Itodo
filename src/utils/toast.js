/**
 * Toast 工具函数 - 用于在 Zustand store 中触发 toast
 * 由于 store 不能直接使用 React hooks，所以通过事件系统通信
 */

export function showToast(type, message, options = {}) {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(new CustomEvent('toast', {
    detail: {
      type,
      message,
      ...options
    }
  }));
}

export const toast = {
  success: (message, options) => showToast('success', message, options),
  error: (message, options) => showToast('error', message, options),
  warning: (message, options) => showToast('warning', message, options),
  info: (message, options) => showToast('info', message, options),
};