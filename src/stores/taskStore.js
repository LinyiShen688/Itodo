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
import { toast } from '@/utils/toast';

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
      toast.error('添加任务失败');
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
        toast.error('更新任务失败，已恢复原状态');
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
      
      // 成功提示
      toast.success('任务已移至收纳箱', { 
        duration: 3000,
        action: {
          label: '查看收纳箱',
          onClick: () => {
            // 可以在这里触发打开收纳箱的事件
            window.dispatchEvent(new CustomEvent('openTrash'));
          }
        }
      });
      
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
      toast.error('移动任务失败，已恢复原位置', {
        duration: 4000,
        action: {
          label: '重试',
          onClick: () => {
            // 可以在这里添加重试逻辑
          }
        }
      });
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
      toast.error('任务排序失败，已恢复原顺序', {
        duration: 4000
      });
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
      toast.error('切换任务状态失败', {
        duration: 3000
      });
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

  // 批量操作支持（性能优化）
  batchUpdate: (updates) => {
    set(state => ({
      pendingUpdates: [...state.pendingUpdates, ...updates]
    }));
    
    get()._scheduleBatchExecution();
  },

  // 内部：调度批量执行
  _scheduleBatchExecution: () => {
    const state = get();
    if (state.updateTimeoutId) {
      clearTimeout(state.updateTimeoutId);
    }
    
    const timeoutId = setTimeout(async () => {
      await get()._executeBatchUpdates();
    }, 300); // 减少延迟到300ms，提升响应速度
    
    set({ updateTimeoutId: timeoutId });
  },

  // 内部：执行批量更新
  _executeBatchUpdates: async () => {
    const state = get();
    const pendingUpdates = state.pendingUpdates;
    
    if (pendingUpdates.length === 0) return;
    
    // 清空队列
    set({ pendingUpdates: [], updateTimeoutId: null });
    
    try {
      // 合并相同任务的更新
      const mergedUpdates = pendingUpdates.reduce((acc, update) => {
        if (acc[update.id]) {
          acc[update.id] = { ...acc[update.id], ...update.data };
        } else {
          acc[update.id] = update.data;
        }
        return acc;
      }, {});

      // 执行批量更新
      const updatePromises = Object.entries(mergedUpdates).map(([id, data]) => 
        dbUpdateTask(id, data)
      );
      
      await Promise.all(updatePromises);
      
      // 批量更新成功提示
      const successCount = updatePromises.length;
      console.log(`Batch update completed: ${successCount} tasks updated`);
      
      if (successCount > 1) {
        toast.success(`成功更新 ${successCount} 个任务`, { duration: 2000 });
      }
      
    } catch (err) {
      console.error('Batch update failed:', err);
      // 重新加载以确保数据一致性
      get().loadTasks(state.currentListId, true);
      set({ error: 'Batch update failed. Data reloaded.' });
      toast.error('批量更新失败，已重新加载数据', { duration: 4000 });
    }
  },

  // 智能更新：小更新使用批量，大更新直接执行
  smartUpdate: async (taskId, updates, immediate = false) => {
    if (immediate) {
      // 立即执行
      return await get().updateTask(taskId, updates);
    }
    
    // 添加到批量队列
    get().batchUpdate([{ id: taskId, data: updates }]);
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