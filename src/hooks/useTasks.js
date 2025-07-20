'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAllTasks,
  getTasksByQuadrant,
  addTask,
  updateTask,
  deleteTask,
  moveTaskToQuadrant,
  reorderTasks
} from '@/lib/indexeddb';
import { useTrashStore } from '@/stores/trashStore';

export function useTasks(listId = 'today') {
  const [tasks, setTasks] = useState({
    1: [], // 重要且紧急
    2: [], // 重要不紧急
    3: [], // 紧急不重要
    4: []  // 不重要不紧急
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentListId, setCurrentListId] = useState(listId);
  const incrementDeletedCount = useTrashStore((state) => state.incrementDeletedCount);

  // 加载任务
  const loadTasks = useCallback(async (forceLoading = false) => {
    try {
      // 检查是否需要显示loading状态
      const isEmptyTasks = !tasks[1].length && !tasks[2].length && !tasks[3].length && !tasks[4].length;
      const isListChanged = currentListId !== listId;
      
      if (forceLoading || isEmptyTasks || isListChanged) {
        setLoading(true);
      }
      
      setError(null);
      
      const allTasks = await getAllTasks(listId);
      
      // 按象限分组
      const groupedTasks = {
        1: [],
        2: [],
        3: [],
        4: []
      };
      
      allTasks.forEach(task => {
        groupedTasks[task.quadrant].push(task);
      });

      // 按“未完成在前、完成在后”排序，同时保持既有 order
      for (const q in groupedTasks) {
        groupedTasks[q].sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed - b.completed; // 0 在前
          }
          return a.order - b.order;
        });
      }
      
      setTasks(groupedTasks);
      setCurrentListId(listId);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId, currentListId, tasks]);

  // 初始加载
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 监听listId变化
  useEffect(() => {
    if (listId !== currentListId) {
      loadTasks();
    }
  }, [listId, currentListId, loadTasks]);

  // 添加新任务
  const handleAddTask = useCallback(async (quadrant, text = '') => {
    try {
      const existingTasks = tasks[quadrant];
      const order = existingTasks.length;
      
      const newTask = await addTask({
        text,
        quadrant,
        listId,
        order
      });
      
      setTasks(prev => ({
        ...prev,
        [quadrant]: [...prev[quadrant], newTask]
      }));
      
      return newTask;
    } catch (err) {
      console.error('Failed to add task:', err);
      setError(err.message);
      throw err;
    }
  }, [tasks, listId]);

  // 更新任务
  const handleUpdateTask = useCallback(async (taskId, updates) => {
    try {
      const updatedTask = await updateTask(taskId, updates);
      
      setTasks(prev => {
        const newTasks = { ...prev };
        
        // 找到任务并更新
        for (const quadrant in newTasks) {
          const taskIndex = newTasks[quadrant].findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            newTasks[quadrant][taskIndex] = updatedTask;
            break;
          }
        }
        
        return newTasks;
      });
      
      return updatedTask;
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // 删除任务
  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await deleteTask(taskId);
      
      setTasks(prev => {
        const newTasks = { ...prev };
        
        // 从所有象限中移除该任务
        for (const quadrant in newTasks) {
          newTasks[quadrant] = newTasks[quadrant].filter(t => t.id !== taskId);
        }
        
        return newTasks;
      });

      // 更新收纳箱计数
      incrementDeletedCount();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err.message);
      throw err;
    }
  }, [incrementDeletedCount]);

  // 移动任务到不同象限
  const handleMoveTask = useCallback(async (taskId, fromQuadrant, toQuadrant, newOrder = 0) => {
    try {
      await moveTaskToQuadrant(taskId, toQuadrant, newOrder);
      
      setTasks(prev => {
        const newTasks = { ...prev };
        
        // 从源象限移除
        const taskIndex = newTasks[fromQuadrant].findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          const [task] = newTasks[fromQuadrant].splice(taskIndex, 1);
          
          // 更新任务象限
          task.quadrant = toQuadrant;
          task.order = newOrder;
          
          // 添加到目标象限
          newTasks[toQuadrant].splice(newOrder, 0, task);
          
          // 重新排序目标象限
          newTasks[toQuadrant].forEach((t, index) => {
            t.order = index;
          });
        }
        
        return newTasks;
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // 重新排序象限内的任务
  const handleReorderTasks = useCallback(async (quadrant, reorderedTasks) => {
    try {
      // 更新本地状态
      setTasks(prev => ({
        ...prev,
        [quadrant]: reorderedTasks
      }));
      
      // 保存到数据库
      await reorderTasks(reorderedTasks);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      setError(err.message);
      // 重新加载任务以恢复正确状态
      await loadTasks();
      throw err;
    }
  }, [loadTasks]);

  // 切换任务完成状态
  const handleToggleComplete = useCallback(async (taskId) => {
    const taskEntry = Object.entries(tasks).find(([_q, arr]) => arr.some(t => t.id === taskId));
    if (!taskEntry) return;

    const [quadrantKey, quadrantTasks] = taskEntry;
    const quadrant = parseInt(quadrantKey);
    const taskIndex = quadrantTasks.findIndex(t => t.id === taskId);
    const task = quadrantTasks[taskIndex];

    const newCompleted = task.completed ? 0 : 1;

    // 先更新 completed 字段
    const updatedTask = await handleUpdateTask(taskId, { completed: newCompleted });

    // 重新排序本象限：未完成在前，完成在后
    setTasks(prev => {
      const newQuadrantTasks = [...prev[quadrant]];
      // 替换更新后的任务
      newQuadrantTasks[taskIndex] = updatedTask;

      // 重新排序
      newQuadrantTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        return a.order - b.order;
      });

      // 重新赋值 order
      newQuadrantTasks.forEach((t, idx) => { t.order = idx; });

      const newState = { ...prev, [quadrant]: newQuadrantTasks };
      return newState;
    });

    // 持久化 order
    try {
      await reorderTasks(
        quadrantTasks
          .map(t => (t.id === taskId ? { ...t, completed: newCompleted } : t))
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed - b.completed;
            return a.order - b.order;
          })
      );
    } catch (e) {
      console.error('Failed to persist reorder after toggle complete:', e);
    }

    return updatedTask;
  }, [tasks, handleUpdateTask]);

  // 更新任务文本和预计时间
  const handleUpdateTaskText = useCallback(async (taskId, updates) => {
    // 兼容旧接口：如果第二个参数是字符串，则只更新文本
    if (typeof updates === 'string') {
      return await handleUpdateTask(taskId, { text: updates });
    }
    // 新接口：接受包含text和estimatedTime的对象
    return await handleUpdateTask(taskId, updates);
  }, [handleUpdateTask]);

  // 获取指定象限的任务
  const getQuadrantTasks = useCallback((quadrant) => {
    return tasks[quadrant] || [];
  }, [tasks]);

  // 获取任务总数
  const getTaskCount = useCallback(() => {
    return Object.values(tasks).flat().length;
  }, [tasks]);

  // 获取已完成任务数
  const getCompletedCount = useCallback(() => {
    return Object.values(tasks).flat().filter(t => t.completed).length;
  }, [tasks]);

  return {
    // 状态
    tasks,
    loading,
    error,
    
    // 操作
    loadTasks,
    addTask: handleAddTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    moveTask: handleMoveTask,
    reorderTasks: handleReorderTasks,
    toggleComplete: handleToggleComplete,
    updateTaskText: handleUpdateTaskText,
    
    // 辅助函数
    getQuadrantTasks,
    getTaskCount,
    getCompletedCount
  };
} 