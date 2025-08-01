'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUnifiedStorage } from '@/lib/unified-storage';
import { useAuthStore } from '@/stores/authStore';

export function useTrash(listId = null) {
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const unifiedStorage = useUnifiedStorage();
  const authStore = useAuthStore();

  // 加载已删除的任务
  const loadDeletedTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let tasks;
      if (listId) {
        tasks = await unifiedStorage.getDeletedTasks(listId);
      } else {
        tasks = await unifiedStorage.getAllDeletedTasks();
      }
      
      setDeletedTasks(tasks);
    } catch (err) {
      console.error('Failed to load deleted tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId, unifiedStorage]);

  // 初始加载
  useEffect(() => {
    loadDeletedTasks();
  }, [loadDeletedTasks]);

  // 添加删除的任务到本地状态（用于实时更新）
  const addDeletedTask = useCallback((task) => {
    setDeletedTasks(prev => [task, ...prev]);
  }, []);

  // 恢复任务
  const handleRestoreTask = useCallback(async (taskId) => {
    try {
      await unifiedStorage.restoreTask(taskId, authStore);
      
      // 从本地状态中移除已恢复的任务
      setDeletedTasks(prev => prev.filter(task => task.id !== taskId));
      
      return true;
    } catch (err) {
      console.error('Failed to restore task:', err);
      setError(err.message);
      throw err;
    }
  }, [unifiedStorage, authStore]);

  // 永久删除任务
  const handlePermanentDeleteTask = useCallback(async (taskId) => {
    try {
      await unifiedStorage.permanentDeleteTask(taskId);
      
      // 从本地状态中移除已永久删除的任务
      setDeletedTasks(prev => prev.filter(task => task.id !== taskId));
      
      return true;
    } catch (err) {
      console.error('Failed to permanently delete task:', err);
      setError(err.message);
      throw err;
    }
  }, [unifiedStorage]);

  // 清空收纳箱（永久删除所有）
  const handleClearTrash = useCallback(async () => {
    try {
      const tasksToDelete = listId 
        ? deletedTasks 
        : deletedTasks.filter(task => !listId || task.listId === listId);
      
      await Promise.all(
        tasksToDelete.map(task => unifiedStorage.permanentDeleteTask(task.id))
      );
      
      setDeletedTasks(prev => 
        listId 
          ? []
          : prev.filter(task => task.listId !== listId)
      );
      
      return true;
    } catch (err) {
      console.error('Failed to clear trash:', err);
      setError(err.message);
      throw err;
    }
  }, [deletedTasks, listId, unifiedStorage]);

  // 批量恢复任务
  const handleRestoreMultipleTasks = useCallback(async (taskIds) => {
    try {
      await Promise.all(taskIds.map(taskId => unifiedStorage.restoreTask(taskId, authStore)));
      
      // 从本地状态中移除已恢复的任务
      setDeletedTasks(prev => prev.filter(task => !taskIds.includes(task.id)));
      
      return true;
    } catch (err) {
      console.error('Failed to restore multiple tasks:', err);
      setError(err.message);
      throw err;
    }
  }, [unifiedStorage, authStore]);

  // 获取已删除任务数量
  const getDeletedTaskCount = useCallback(() => {
    return deletedTasks.length;
  }, [deletedTasks]);

  return {
    // 状态
    deletedTasks,
    loading,
    error,
    
    // 操作
    loadDeletedTasks,
    restoreTask: handleRestoreTask,
    permanentDeleteTask: handlePermanentDeleteTask,
    clearTrash: handleClearTrash,
    restoreMultipleTasks: handleRestoreMultipleTasks,
    addDeletedTask,
    
    // 辅助函数
    getDeletedTaskCount
  };
}