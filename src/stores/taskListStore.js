'use client';

import { create } from 'zustand';
import { useUnifiedStorage } from '@/lib/unified-storage';
import { useTaskStore } from './taskStore';
import { useAuthStore } from './authStore';

export const useTaskListStore = create((set, get) => ({
  // 状态
  taskLists: [],
  activeList: null,
  loading: false,
  error: null,
  hasInitialized: false,

  // 基础操作
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // 加载任务列表
  loadTaskLists: async () => {
    try {
      set({ loading: true, error: null });
      
      const unifiedStorage = useUnifiedStorage.getState();
      const [lists, active] = await Promise.all([
        unifiedStorage.getTaskLists(),
        unifiedStorage.getActiveTaskList()
      ]);
      
      set({ 
        taskLists: lists, 
        activeList: active, 
        loading: false 
      });

      // 如果有活动列表，加载对应的任务
      if (active) {
        useTaskStore.getState().loadTasks(active.id);
      }
    } catch (err) {
      console.error('Failed to load task lists:', err);
      set({ error: err.message, loading: false });
    }
  },

  // 添加新任务列表
  addTaskList: async (name, layoutMode = 'FOUR', showETA = true) => {
    try {
      const unifiedStorage = useUnifiedStorage.getState();
      const authStore = useAuthStore.getState();
      const newList = await unifiedStorage.addTaskList(name, layoutMode, showETA, authStore);
      
      set(state => ({
        taskLists: [...state.taskLists, newList]
      }));
      
      return newList;
    } catch (err) {
      console.error('Failed to add task list:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 更新任务列表
  updateTaskList: async (id, updates) => {
    try {
      const unifiedStorage = useUnifiedStorage.getState();
      const authStore = useAuthStore.getState();
      const updatedList = await unifiedStorage.updateTaskList(id, updates, authStore);
      
      set(state => ({
        taskLists: state.taskLists.map(list => 
          list.id === id ? updatedList : list
        ),
        activeList: state.activeList?.id === id ? updatedList : state.activeList
      }));
      
      return updatedList;
    } catch (err) {
      console.error('Failed to update task list:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 设置活动任务列表
  setActiveList: async (id) => {
    try {
      const unifiedStorage = useUnifiedStorage.getState();
      const authStore = useAuthStore.getState();
      const newActiveList = await unifiedStorage.setActiveTaskList(id, authStore);
      
      set(state => ({
        taskLists: state.taskLists.map(list => ({
          ...list,
          isActive: list.id === id ? 1 : 0
        })),
        activeList: newActiveList
      }));

      // 切换任务列表时，加载对应的任务
      if (newActiveList) {
        useTaskStore.getState().loadTasks(newActiveList.id);
      }
      
      return newActiveList;
    } catch (err) {
      console.error('Failed to set active list:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 删除任务列表
  deleteTaskList: async (id) => {
    try {
      const state = get();
      
      if (state.taskLists.length <= 1) {
        throw new Error('至少需要保留一个任务列表');
      }
      
      const unifiedStorage = useUnifiedStorage.getState();
      const authStore = useAuthStore.getState();
      await unifiedStorage.deleteTaskList(id, authStore);
      
      const remainingLists = state.taskLists.filter(list => list.id !== id);
      let newActiveList = state.activeList;
      
      // 如果删除的是当前活动列表，设置第一个列表为活动列表
      if (state.activeList?.id === id) {
        if (remainingLists.length > 0) {
          newActiveList = await unifiedStorage.setActiveTaskList(remainingLists[0].id, authStore);
          // 加载新活动列表的任务
          useTaskStore.getState().loadTasks(newActiveList.id);
        } else {
          newActiveList = null;
        }
      }
      
      set({
        taskLists: remainingLists,
        activeList: newActiveList
      });
      
    } catch (err) {
      console.error('Failed to delete task list:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 选择器函数
  getTaskListById: (id) => {
    return get().taskLists.find(list => list.id === id);
  },

  getActiveTaskList: () => {
    return get().activeList;
  },

  // 重置状态
  reset: () => set({
    taskLists: [],
    activeList: null,
    loading: false,
    error: null
  }),

  // 初始化
  initialize: async () => {
    const state = get();
    
    // 初始化 UnifiedStorage（如果还没初始化）
    if (!state.hasInitialized) {
      const unifiedStorage = useUnifiedStorage.getState();
      const authStore = useAuthStore.getState();
      unifiedStorage.initialize(authStore);
      set({ hasInitialized: true });
      
      // 同时初始化 taskStore
      await useTaskStore.getState().initialize();
    }
    
    await get().loadTaskLists();
    
    // 检查是否有任务列表，如果没有则创建默认列表
    const currentState = get();
    if (currentState.taskLists.length === 0) {
      try {
        const unifiedStorage = useUnifiedStorage.getState();
        const authStore = useAuthStore.getState();
        
        // 创建默认任务列表
        const defaultList = await unifiedStorage.addTaskList('今天要做的事', 'FOUR', true, authStore);
        
        // 设置为活动列表
        const activeList = await unifiedStorage.setActiveTaskList(defaultList.id, authStore);
        
        set({
          taskLists: [defaultList],
          activeList: activeList
        });
        
        // 加载该列表的任务（虽然是空的）
        useTaskStore.getState().loadTasks(defaultList.id);
      } catch (err) {
        console.error('Failed to create default task list:', err);
        set({ error: err.message });
      }
    }
  }
}));