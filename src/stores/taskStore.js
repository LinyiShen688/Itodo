'use client';

import { create } from 'zustand';
import {
  getAllTasks,
  addTask as dbAddTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  moveTaskToQuadrant,
  reorderTasks as dbReorderTasks
} from '@/lib/indexeddb';
import { useTrashStore } from './trashStore';

// 初始任务状态
const initialTasksState = {
  1: [], // 重要且紧急
  2: [], // 重要不紧急  
  3: [], // 紧急不重要
  4: []  // 不重要不紧急
};

export const useTaskStore = create((set, get) => ({
  // 状态
  tasks: initialTasksState,
  loading: false,
  error: null,
  currentListId: 'today',
  
  // 批量操作队列（性能优化）
  pendingUpdates: [],
  updateTimeoutId: null,

  // 基础操作
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentListId: (listId) => set({ currentListId: listId }),

  // 加载任务
  loadTasks: async (listId = 'today', forceLoading = false) => {
    try {
      const state = get();
      
      // 检查是否需要显示loading状态
      const isEmptyTasks = Object.values(state.tasks).every(arr => arr.length === 0);
      const isListChanged = state.currentListId !== listId;
      
      if (forceLoading || isEmptyTasks || isListChanged) {
        set({ loading: true });
      }

      set({ error: null, currentListId: listId });

      const allTasks = await getAllTasks(listId);
      
      // 按象限分组
      const groupedTasks = { 1: [], 2: [], 3: [], 4: [] };
      allTasks.forEach(task => {
        groupedTasks[task.quadrant].push(task);
      });

      // 按"未完成在前、完成在后"排序，同时保持既有order
      for (const q in groupedTasks) {
        groupedTasks[q].sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed - b.completed; // 0在前
          }
          return a.order - b.order;
        });
      }

      set({ tasks: groupedTasks, loading: false });

    } catch (err) {
      console.error('Failed to load tasks:', err);
      set({ error: err.message, loading: false });
    }
  },

  // 添加任务
  addTask: async (quadrant, text = '') => {
    try {
      const state = get();
      const existingTasks = state.tasks[quadrant];
      const order = existingTasks.length;
      
      const newTask = await dbAddTask({
        text,
        quadrant,
        listId: state.currentListId,
        order
      });

      set(state => ({
        tasks: {
          ...state.tasks,
          [quadrant]: [...state.tasks[quadrant], newTask]
        }
      }));

      return newTask;
    } catch (err) {
      console.error('Failed to add task:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 更新任务（支持乐观更新）
  updateTask: async (taskId, updates, optimistic = true) => {
    try {
      // 乐观更新UI
      if (optimistic) {
        set(state => {
          const newTasks = { ...state.tasks };
          for (const quadrant in newTasks) {
            const taskIndex = newTasks[quadrant].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
              newTasks[quadrant] = [...newTasks[quadrant]];
              newTasks[quadrant][taskIndex] = {
                ...newTasks[quadrant][taskIndex],
                ...updates,
                updatedAt: new Date()
              };
              break;
            }
          }
          return { tasks: newTasks };
        });
      }

      // 实际数据库更新
      const updatedTask = await dbUpdateTask(taskId, updates);

      // 确保UI与数据库同步
      if (!optimistic) {
        set(state => {
          const newTasks = { ...state.tasks };
          for (const quadrant in newTasks) {
            const taskIndex = newTasks[quadrant].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
              newTasks[quadrant] = [...newTasks[quadrant]];
              newTasks[quadrant][taskIndex] = updatedTask;
              break;
            }
          }
          return { tasks: newTasks };
        });
      }

      return updatedTask;
    } catch (err) {
      console.error('Failed to update task:', err);
      // 如果是乐观更新失败，需要回滚
      if (optimistic) {
        get().loadTasks(get().currentListId, true);
      }
      set({ error: err.message });
      throw err;
    }
  },

  // 删除任务（软删除）
  deleteTask: async (taskId) => {
    try {
      await dbDeleteTask(taskId);

      set(state => {
        const newTasks = { ...state.tasks };
        // 从所有象限中移除该任务
        for (const quadrant in newTasks) {
          newTasks[quadrant] = newTasks[quadrant].filter(t => t.id !== taskId);
        }
        return { tasks: newTasks };
      });

      // 更新收纳箱计数
      useTrashStore.getState().incrementDeletedCount();
    } catch (err) {
      console.error('Failed to delete task:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 移动任务到不同象限
  moveTask: async (taskId, fromQuadrant, toQuadrant, newOrder = 0) => {
    try {
      // 乐观更新
      set(state => {
        const newTasks = { ...state.tasks };
        const taskIndex = newTasks[fromQuadrant].findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
          // 复制数组以避免直接修改
          newTasks[fromQuadrant] = [...newTasks[fromQuadrant]];
          newTasks[toQuadrant] = [...newTasks[toQuadrant]];
          
          const [task] = newTasks[fromQuadrant].splice(taskIndex, 1);
          
          // 更新任务属性
          const updatedTask = {
            ...task,
            quadrant: toQuadrant,
            order: newOrder
          };
          
          // 添加到目标象限
          newTasks[toQuadrant].splice(newOrder, 0, updatedTask);
          
          // 重新排序目标象限
          newTasks[toQuadrant] = newTasks[toQuadrant].map((t, index) => ({
            ...t,
            order: index
          }));
        }
        
        return { tasks: newTasks };
      });

      await moveTaskToQuadrant(taskId, toQuadrant, newOrder);
    } catch (err) {
      console.error('Failed to move task:', err);
      // 回滚
      get().loadTasks(get().currentListId, true);
      set({ error: err.message });
      throw err;
    }
  },

  // 重新排序任务
  reorderTasks: async (quadrant, reorderedTasks) => {
    try {
      // 乐观更新
      set(state => ({
        tasks: {
          ...state.tasks,
          [quadrant]: reorderedTasks
        }
      }));

      // 持久化到数据库
      await dbReorderTasks(reorderedTasks);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      // 回滚
      await get().loadTasks(get().currentListId, true);
      set({ error: err.message });
      throw err;
    }
  },

  // 切换任务完成状态
  toggleComplete: async (taskId) => {
    try {
      const state = get();
      const taskEntry = Object.entries(state.tasks).find(([_q, arr]) => 
        arr.some(t => t.id === taskId)
      );
      
      if (!taskEntry) return;

      const [quadrantKey, quadrantTasks] = taskEntry;
      const quadrant = parseInt(quadrantKey);
      const taskIndex = quadrantTasks.findIndex(t => t.id === taskId);
      const task = quadrantTasks[taskIndex];
      const newCompleted = task.completed ? 0 : 1;

      // 先更新completed字段
      const updatedTask = await get().updateTask(taskId, { completed: newCompleted });

      // 重新排序本象限：未完成在前，完成在后
      set(state => {
        const newQuadrantTasks = [...state.tasks[quadrant]];
        // 替换更新后的任务
        newQuadrantTasks[taskIndex] = updatedTask;

        // 重新排序
        newQuadrantTasks.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed - b.completed;
          return a.order - b.order;
        });

        // 重新赋值order
        const sortedTasks = newQuadrantTasks.map((t, idx) => ({ ...t, order: idx }));

        return {
          tasks: {
            ...state.tasks,
            [quadrant]: sortedTasks
          }
        };
      });

      // 持久化order
      try {
        const finalTasks = state.tasks[quadrant]
          .map(t => (t.id === taskId ? { ...t, completed: newCompleted } : t))
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed - b.completed;
            return a.order - b.order;
          });
        await dbReorderTasks(finalTasks);
      } catch (e) {
        console.error('Failed to persist reorder after toggle complete:', e);
      }

      return updatedTask;
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
      set({ error: err.message });
      throw err;
    }
  },

  // 更新任务文本和预计时间
  updateTaskText: async (taskId, updates) => {
    // 兼容旧接口：如果第二个参数是字符串，则只更新文本
    if (typeof updates === 'string') {
      return await get().updateTask(taskId, { text: updates });
    }
    // 新接口：接受包含text和estimatedTime的对象
    return await get().updateTask(taskId, updates);
  },

  // 选择器函数（性能优化）
  getQuadrantTasks: (quadrant) => {
    return get().tasks[quadrant] || [];
  },

  getTaskCount: () => {
    return Object.values(get().tasks).flat().length;
  },

  getCompletedCount: () => {
    return Object.values(get().tasks).flat().filter(t => t.completed).length;
  },

  // 批量操作支持（未来扩展）
  batchUpdate: (updates) => {
    set(state => ({
      pendingUpdates: [...state.pendingUpdates, ...updates]
    }));
    
    // 防抖执行
    const state = get();
    if (state.updateTimeoutId) {
      clearTimeout(state.updateTimeoutId);
    }
    
    const timeoutId = setTimeout(async () => {
      const pendingUpdates = get().pendingUpdates;
      set({ pendingUpdates: [], updateTimeoutId: null });
      
      // 执行批量更新
      try {
        await Promise.all(
          pendingUpdates.map(update => 
            dbUpdateTask(update.id, update.data)
          )
        );
      } catch (err) {
        console.error('Batch update failed:', err);
      }
    }, 500);
    
    set({ updateTimeoutId: timeoutId });
  },

  // 重置状态
  reset: () => {
    const state = get();
    if (state.updateTimeoutId) {
      clearTimeout(state.updateTimeoutId);
    }
    set({
      tasks: initialTasksState,
      loading: false,
      error: null,
      currentListId: 'today',
      pendingUpdates: [],
      updateTimeoutId: null
    });
  }
}));