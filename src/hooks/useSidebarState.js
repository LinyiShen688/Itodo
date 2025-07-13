'use client';

import { useLocalStorage } from './useLocalStorage';

export function useSidebarState() {
  const [isOpen, setIsOpen] = useLocalStorage('iTodo-sidebar-open', false);
  
  return {
    isOpen,
    setIsOpen,
  };
} 