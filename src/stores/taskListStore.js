'use client';

import { create } from 'zustand';
import {
  getAllTaskLists,
  getActiveTaskList,
  addTaskList as dbAddTaskList,
  updateTaskList as dbUpdateTaskList,
  setActiveTaskList as dbSetActiveTaskList,
  deleteTaskList as dbDeleteTaskList
} from '@/lib/indexeddb-manager';
import { useTaskStore } from './taskStore';

export const useTaskListStore = create((set, get) => ({
  // 状态
  taskLists: [],
  activeList: null,
  loading: false,
  error: null,

  // 基础操作
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // 加载任务列表
  loadTaskLists: async () => {
    try {
      set({ loading: true, error: null });
      
      const [lists, active] = await Promise.all([
        getAllTaskLists(),
        getActiveTaskList()
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
      const newList = await dbAddTaskList(name, layoutMode, showETA);
      
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
      const updatedList = await dbUpdateTaskList(id, updates);
      
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
      const newActiveList = await dbSetActiveTaskList(id);
      
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
      
      await dbDeleteTaskList(id);
      
      const remainingLists = state.taskLists.filter(list => list.id !== id);
      let newActiveList = state.activeList;
      
      // 如果删除的是当前活动列表，设置第一个列表为活动列表
      if (state.activeList?.id === id) {
        if (remainingLists.length > 0) {
          newActiveList = await dbSetActiveTaskList(remainingLists[0].id);
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
    await get().loadTaskLists();
  }
}));