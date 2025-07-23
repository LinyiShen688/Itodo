'use client';

import { useLocalStorage } from './useLocalStorage';
import { useEffect } from 'react';

export function useSidebarState() {
  const [isOpen, setIsOpen] = useLocalStorage('iTodo-sidebar-open', false);
  
  // 桌面端推拉效果 - 管理body的class
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 检查是否为桌面端
    const isDesktop = () => window.innerWidth >= 768;
    
    const updateBodyClass = () => {
      const body = document.body;
      if (isDesktop() && isOpen) {
        body.classList.add('sidebar-open');
      } else {
        body.classList.remove('sidebar-open');
      }
    };
    
    // 初始设置
    updateBodyClass();
    
    // 监听窗口大小变化
    const handleResize = () => {
      updateBodyClass();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // 清理时移除class
      document.body.classList.remove('sidebar-open');
    };
  }, [isOpen]);
  
  return {
    isOpen,
    setIsOpen,
  };
} 