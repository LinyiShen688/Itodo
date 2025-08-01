'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedStorage } from '@/lib/unified-storage';
import { useAuthStore } from '@/stores/authStore';

export function useTaskLists() {
  const [taskLists, setTaskLists] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 使用 UnifiedStorage 和 AuthStore
  const unifiedStorage = useUnifiedStorage();
  const authStore = useAuthStore();
  const hasInitialized = useRef(false);
  
  // 初始化 UnifiedStorage（只执行一次）
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const cleanup = unifiedStorage.initialize(authStore);
      return cleanup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载任务列表
  const loadTaskLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [lists, active] = await Promise.all([
        unifiedStorage.getTaskLists(),
        unifiedStorage.getActiveTaskList()
      ]);
      
      setTaskLists(lists);
      setActiveList(active);
    } catch (err) {
      console.error('Failed to load task lists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unifiedStorage]);

  // 初始加载
  useEffect(() => {
    loadTaskLists();
  }, [loadTaskLists]);

  // 添加新任务列表
  const handleAddTaskList = useCallback(async (name, layoutMode = 'FOUR', showETA = true) => {
    try {
      const newList = await unifiedStorage.addTaskList(name, layoutMode, showETA, authStore);
      setTaskLists(prev => [...prev, newList]);
      return newList;
    } catch (err) {
      console.error('Failed to add task list:', err);
      setError(err.message);
      throw err;
    }
  }, [unifiedStorage, authStore]);

  // 更新任务列表
  const handleUpdateTaskList = useCallback(async (id, updates) => {
    try {
      const updatedList = await unifiedStorage.updateTaskList(id, updates, authStore);
      
      setTaskLists(prev => 
        prev.map(list => 
          list.id === id ? updatedList : list
        )
      );
      
      // 如果更新的是活动列表，也要更新活动列表状态
      if (activeList && activeList.id === id) {
        setActiveList(updatedList);
      }
      
      return updatedList;
    } catch (err) {
      console.error('Failed to update task list:', err);
      setError(err.message);
      throw err;
    }
  }, [activeList, unifiedStorage, authStore]);

  // 设置活动任务列表
  const handleSetActiveList = useCallback(async (id) => {
    try {
      const newActiveList = await unifiedStorage.setActiveTaskList(id, authStore);
      
      // 更新任务列表状态
      setTaskLists(prev => 
        prev.map(list => ({
          ...list,
          isActive: list.id === id ? 1 : 0
        }))
      );
      
      setActiveList(newActiveList);

      // 通知其他组件活动列表已变更
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task-list-changed'));
      }
      return newActiveList;
    } catch (err) {
      console.error('Failed to set active task list:', err);
      setError(err.message);
      throw err;
    }
  }, [unifiedStorage, authStore]);

  // 删除任务列表
  const handleDeleteTaskList = useCallback(async (id) => {
    try {
      // 检查是否是活动列表
      const isActiveList = activeList && activeList.id === id;
      
      await unifiedStorage.deleteTaskList(id, authStore);
      
      // 从列表中移除
      setTaskLists(prev => prev.filter(list => list.id !== id));
      
      // 如果删除的是活动列表，需要设置新的活动列表
      if (isActiveList) {
        const remainingLists = taskLists.filter(list => list.id !== id);
        if (remainingLists.length > 0) {
          await handleSetActiveList(remainingLists[0].id);
        } else {
          setActiveList(null);
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task-list-changed'));
      }
    } catch (err) {
      console.error('Failed to delete task list:', err);
      setError(err.message);
      throw err;
    }
  }, [activeList, taskLists, handleSetActiveList, unifiedStorage, authStore]);

  // 监听全局事件，跨组件同步
  useEffect(() => {
    const handler = () => {
      loadTaskLists();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('task-list-changed', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('task-list-changed', handler);
      }
    };
  }, [loadTaskLists]);

  // 根据ID获取任务列表
  const getTaskListById = useCallback((id) => {
    return taskLists.find(list => list.id === id);
  }, [taskLists]);

  // 检查列表名是否已存在
  const isNameExists = useCallback((name, excludeId = null) => {
    return taskLists.some(list => 
      list.name === name && list.id !== excludeId
    );
  }, [taskLists]);

  return {
    // 状态
    taskLists,
    activeList,
    loading,
    error,
    
    // 操作
    loadTaskLists,
    addTaskList: handleAddTaskList,
    updateTaskList: handleUpdateTaskList,
    setActiveList: handleSetActiveList,
    deleteTaskList: handleDeleteTaskList,
    
    // 辅助函数
    getTaskListById,
    isNameExists
  };
} 