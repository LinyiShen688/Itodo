'use client';

import { create } from 'zustand';
import { useUnifiedStorage } from '@/lib/unified-storage';

export const useTrashStore = create((set, get) => ({
  deletedTaskCount: 0,
  
  // 更新删除任务数量
  updateDeletedTaskCount: async () => {
    try {
      const unifiedStorage = useUnifiedStorage.getState();
      const deletedTasks = await unifiedStorage.getAllDeletedTasks();
      set({ deletedTaskCount: deletedTasks.length });
    } catch (error) {
      console.error('Failed to update deleted task count:', error);
    }
  },

  // 增加计数
  incrementDeletedCount: () => {
    set((state) => ({ deletedTaskCount: state.deletedTaskCount + 1 }));
  },

  // 减少计数
  decrementDeletedCount: () => {
    set((state) => ({ 
      deletedTaskCount: Math.max(0, state.deletedTaskCount - 1) 
    }));
  },

  // 重置计数
  resetDeletedCount: () => {
    set({ deletedTaskCount: 0 });
  },

  // 批量减少计数
  decrementDeletedCountBy: (count) => {
    set((state) => ({ 
      deletedTaskCount: Math.max(0, state.deletedTaskCount - count) 
    }));
  },

  // 初始化数据
  initializeTrashStore: async () => {
    const { updateDeletedTaskCount } = get();
    await updateDeletedTaskCount();
  }
}));