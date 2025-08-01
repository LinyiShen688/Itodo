/**
 * UnifiedStorage - 统一存储管理层
 * 
 * 职责：
 * - 协调 IndexedDBManager、QueueManager 和 SyncManager
 * - 提供统一的对外接口
 * - 管理认证状态
 * - 处理用户登录/登出事件
 */

import { create } from 'zustand';
import * as dbManager from './indexeddb-manager';
import * as queueManager from './queue-manager';
import * as syncManager from './sync-manager';
import { getUpdatedTasks, getUpdatedTaskLists, getSupabase } from './supabase-db';
import { convertSupabaseToIndexedDB } from './data-converters';
import { normalizeToUTC } from './time-utils';
import { useAuthStore } from '@/stores/authStore';

export const useUnifiedStorage = create((set, get) => ({
  // 初始化状态
  hasInitialized: false,
  
  // 初始化
  initialize: (authStoreOrHook) => {
    // 防止重复初始化
    if (get().hasInitialized) {
      console.log('[UnifiedStorage] Already initialized, skipping...');
      return () => {}; // 返回空的清理函数
    }
    
    console.log('[UnifiedStorage] Initializing...');
    set({ hasInitialized: true });
    
    // 监听认证状态变化
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      console.log('[UnifiedStorage] Auth state changed:', { 
        hadUser: !!prevState?.user, 
        hasUser: !!state.user,
        userId: state.user?.id 
      });
      
      if (state.user && !prevState.user) {
        // 用户登录
        console.log('[UnifiedStorage] User logged in:', state.user.id);
        get().onUserLogin(state.user);
      } else if (!state.user && prevState.user) {
        // 用户登出
        console.log('[UnifiedStorage] User logged out');
      }
    });
    
    // 检查当前认证状态（处理已经登录的情况）
    const currentAuthState = useAuthStore.getState();
    if (currentAuthState.user && currentAuthState.isAuthenticated()) {
      console.log('[UnifiedStorage] User already logged in during initialization:', currentAuthState.user.id);
      // 延迟执行，确保所有初始化完成
      setTimeout(() => {
        get().onUserLogin(currentAuthState.user);
      }, 100);
    }
    
    // 设置网络恢复监听
    syncManager.initNetworkListener();
    syncManager.onNetworkRestore(() => {
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated()) {
        console.log('[UnifiedStorage] Network restored, processing queue...');
        get().processQueue({ getState: () => authState });
      }
    });
    
    // 返回清理函数
    return () => {
      unsubscribe();
      syncManager.destroyNetworkListener();
      set({ hasInitialized: false });
      console.log('[UnifiedStorage] Cleaned up');
    };
  },

  // 统一存储接口 - 任务操作
  getTasks: async (listId) => {
    const tasks = await dbManager.getAllTasks(listId);
    // 过滤掉墓碑数据
    return tasks.filter(task => task.deleted !== 2);
  },
  
  getTaskLists: async () => {
    const lists = await dbManager.getAllTaskLists();
    // 过滤掉已删除的列表
    return lists.filter(list => list.deleted !== 2);
  },

  addTask: async (taskData, authStore) => {
    // 1. 设置 userId（已登录时设置用户ID，未登录时为null）
    const authState = useAuthStore.getState();
    const userId = authState.isAuthenticated() ? authState.user?.id : null;
    const taskWithUserId = { ...taskData, userId };
    
    // 2. 立即写入本地
    const localTask = await dbManager.addTask(taskWithUserId);
    
    // 3. 如果已登录，加入同步队列
    if (authState.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'add',
        entityType: 'task',
        entityId: localTask.id,
        changes: localTask
      });
      
      // 4. 立即尝试同步
      get().processQueue();
    }
    
    return localTask;
  },

  updateTask: async (id, updates, authStore) => {
    // 1. 立即更新本地
    const updatedTask = await dbManager.updateTask(id, updates);
    
    // 2. 如果已登录，加入同步队列
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'task',
        entityId: id,
        changes: updates
      });
      
      get().processQueue();
    }
    
    return updatedTask;
  },

  deleteTask: async (id, permanent, authStore) => {
    // 1. 更新本地删除状态
    const deleteStatus = permanent ? 2 : 1;
    const deletedTask = await dbManager.updateTask(id, { deleted: deleteStatus });
    
    // 2. 如果已登录，同步删除状态
    if (useAuthStore.getState().isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'task',
        entityId: id,
        changes: { deleted: deleteStatus }
      });
      
      get().processQueue();
    }
    
    return deletedTask;
  },

  // 任务列表操作
  addTaskList: async (name, layoutMode, showETA, authStore) => {
    // 1. 设置 userId（已登录时设置用户ID，未登录时为null）
    const userId = useAuthStore.getState().isAuthenticated() ? useAuthStore.getState().user?.id : null;
    
    // 2. 立即创建本地任务列表（在 dbManager 中设置 userId）
    const localList = await dbManager.addTaskList(name, layoutMode, showETA, userId);
    
    // 3. 如果已登录，加入同步队列
    if (useAuthStore.getState().isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'add',
        entityType: 'taskList',
        entityId: localList.id,
        changes: localList
      });
      
      get().processQueue();
    }
    
    return localList;
  },

  updateTaskList: async (id, updates, authStore) => {
    // 1. 立即更新本地
    const updatedList = await dbManager.updateTaskList(id, updates);
    
    // 2. 如果已登录，加入同步队列
    if (useAuthStore.getState().isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'taskList',
        entityId: id,
        changes: updates
      });
      
      get().processQueue();
    }
    
    return updatedList;
  },

  setActiveTaskList: async (id, authStore) => {
    // 0. 如果已登录，先获取当前激活的列表（在更新本地之前）
    let oldActiveList = null;
    if (useAuthStore.getState().isAuthenticated()) {
      const allList = await dbManager.getAllTaskLists();
      oldActiveList = allList.find(list =>
        list.isActive === 1 && list.id !== id && list.deleted !== 2
      );
      console.log('[UnifiedStorage] Current active list before update:', oldActiveList);
    }
    
    // 1. 立即更新本地
    const activeList = await dbManager.setActiveTaskList(id);
    
    // 2. 如果已登录，需要同步激活状态
    if (useAuthStore.getState().isAuthenticated()) {
      console.log('[UnifiedStorage] Target list id:', id);
      
      // 重要：先创建取消激活的同步项
      if (oldActiveList) {
        await queueManager.addToQueue({
          action: 'update',
          entityType: 'taskList',
          entityId: oldActiveList.id,
          changes: { isActive: 0 }
        });
        console.log('[UnifiedStorage] Added deactivate queue item for:', oldActiveList.id);
      } 
      
      // 然后创建激活新列表的同步项
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'taskList',
        entityId: id,
        changes: { isActive: 1 }
      });
      console.log('[UnifiedStorage] Added activate queue item for:', id);
      
      get().processQueue();
    }
    
    return activeList;
  },

  deleteTaskList: async (listId, authStore) => {
    // 1. 先获取该列表下的所有任务
    const tasks = await dbManager.getAllTasks(listId);
    
    // 2. 将所有任务标记为墓碑状态
    for (const task of tasks) {
      await dbManager.updateTask(task.id, { deleted: 2 });
      
      if (useAuthStore.getState().isAuthenticated()) {
        await queueManager.addToQueue({
          action: 'update',
          entityType: 'task',
          entityId: task.id,
          changes: { deleted: 2 }
        });
      }
    }
    
    // 3. 将任务列表标记为墓碑状态
    const deletedList = await dbManager.updateTaskList(listId, { deleted: 2 });
    
    // 4. 如果已登录，同步删除状态
    if (useAuthStore.getState().isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'taskList',
        entityId: listId,
        changes: { deleted: 2 }
      });
      
      get().processQueue();
    }
    
    return deletedList;
  },

  // 队列处理
  processQueue: async () => {
    if (syncManager.getProcessing() || !navigator.onLine || !useAuthStore.getState().isAuthenticated()) {
      return;
    }
    
    syncManager.setProcessing(true);
    
    try {
      const pendingItems = await queueManager.getPendingItems();
      for (const item of pendingItems) {
        await get().processSyncItem(item);
      }
    } finally {
      syncManager.setProcessing(false);
    }
  },

  processSyncItem: async (item) => {
    try {
      // 如果是任务类型，先检查任务列表是否已同步
      if (item.entityType === 'task' && item.changes?.listId) {
        const taskListExists = await get().checkTaskListInCloud(item.changes.listId);
        if (!taskListExists) {
          // 任务列表还未同步，跳过此任务，保持 pending 状态
          console.log(`[UnifiedStorage] Task list ${item.changes.listId} not synced yet, skipping task ${item.entityId}`);
          return; // 直接返回，不改变状态
        }
        
        // 如果是 update 操作，还需要检查任务本身是否已存在
        if (item.action === 'update') {
          const taskExists = await get().checkTaskInCloud(item.entityId);
          if (!taskExists) {
            // 任务还未同步，跳过此更新操作
            console.log(`[UnifiedStorage] Task ${item.entityId} not synced yet, skipping update`);
            return; // 保持 pending 状态
          }
        }
      }
      
      // 更新状态为处理中
      await queueManager.updateItemStatus(item.id, 'processing');
      
      // 执行同步操作
      await syncManager.sync(item.action, item.entityType, item.entityId, item.changes);
      
      // 标记为完成
      await queueManager.updateItemStatus(item.id, 'completed');
      
    } catch (error) {
      // 处理失败
      const retryCount = item.retryCount + 1;
      
      if (retryCount >= 3 || !syncManager.isRetryableError(error)) {
        await queueManager.updateItemStatus(item.id, 'failed', error.message);
      } else {
        await queueManager.updateItem(item.id, {
          status: 'pending',
          retryCount: retryCount
        });
      }
    }
  },

  // 同步状态查询
  getSyncStatus: async () => {
    return await queueManager.getSyncStatus();
  },

  // 用户操作
  retryFailedItem: async (itemId) => {
    await queueManager.updateItem(itemId, {
      status: 'pending',
      retryCount: 0
    });
    await get().processQueue();
  },

  deleteQueueItem: async (itemId) => {
    return await queueManager.deleteQueueItem(itemId);
  },

  // 获取所有已删除的任务
  getAllDeletedTasks: async () => {
    return await dbManager.getAllDeletedTasks();
  },

  // 重新排序任务
  reorderTasks: async (tasks) => {
    return await dbManager.reorderTasks(tasks);
  },

  // 获取当前激活的任务列表
  getActiveTaskList: async () => {
    return await dbManager.getActiveTaskList();
  },

  // 垃圾箱相关操作
  getDeletedTasks: async (listId) => {
    return await dbManager.getDeletedTasks(listId);
  },

  restoreTask: async (id, authStore) => {
    const task = await dbManager.restoreTask(id);
    
    // 如果用户已登录，添加到同步队列
    if (authStore && authStore.isAuthenticated()) {
      await queueManager.addToQueue({
        id: crypto.randomUUID(),
        type: 'UPDATE_TASK',
        data: { id, deleted: 0 },
        userId: authStore.user.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    
    return task;
  },

  permanentDeleteTask: async (id) => {
    // 1. 更新本地删除状态为墓碑
    const deletedTask = await dbManager.permanentDeleteTask(id);
    
    // 2. 如果已登录，同步删除状态
    if (useAuthStore.getState().isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'task',
        entityId: id,
        changes: { deleted: 2 }
      });
      
      get().processQueue();
    }
    
    return deletedTask;
  },

  // 用户登录处理
  onUserLogin: async (user) => {
    try {
      console.log('\x1b[36m[UnifiedStorage] 用户登录，开始处理本地与远程数据同步...\x1b[0m');
      
      // 1. 处理 userId 为 null 的本地数据
      await get().processNullUserIdData(user.id);
      
      // 2. 拉取远程数据
      const remoteData = await get().pullRemoteData(user.id);
      
      // 3. 应用远程数据到本地
      await get().applyRemoteData(remoteData);
      
      // 4. 处理同步队列，推送本地数据到远程
      await get().processQueue();

      // 5. 刷新全局任务列表状态，确保 UI 响应式更新
      const { useTaskListStore } = await import('@/stores/taskListStore');
      await useTaskListStore.getState().loadTaskLists();
      
      
      console.log('[UnifiedStorage] User login processing completed');
    } catch (error) {
      console.error('[UnifiedStorage] Error processing user login:', error);
      // 不抛出错误，避免阻塞登录流程
    }
  },

  // 处理 userId 为 null 的数据
  processNullUserIdData: async (userId) => {
    try {
      // 获取所有 userId 为 null 的数据
      const nullUserIdTaskLists = await dbManager.getNullUserIdTaskLists();
      const nullUserIdTasks = await dbManager.getNullUserIdTasks();
      
      console.log(`[UnifiedStorage] Found ${nullUserIdTaskLists.length} unsynced task lists, ${nullUserIdTasks.length} unsynced tasks`);
      
      if (nullUserIdTaskLists.length === 0 && nullUserIdTasks.length === 0) {
        return;
      }
      
      // 批量更新 userId（并行执行）
      const taskListIds = nullUserIdTaskLists.map(list => list.id);
      const taskIds = nullUserIdTasks.map(task => task.id);
      
      await Promise.all([
        dbManager.updateTaskListsUserId(taskListIds, userId),
        dbManager.updateTasksUserId(taskIds, userId)
      ]);
      
      // 将所有任务列表的 isActive 设置为 0，避免云端已经有isActive=1的数据，报唯一性冲突
      // 本地数据也置为0，后续从云端拉数据
      for (const list of nullUserIdTaskLists) {
        await dbManager.updateTaskList(list.id, { isActive: 0 });
      }
      
      // 批量创建队列项
      const queueItems = [];
      
      // 注意：插入同步队列的时候先插入任务列表的再插入任务，免得任务表的外键找不到。
      // 任务列表队列项
      for (const list of nullUserIdTaskLists) {
        queueItems.push({
          action: 'add',
          entityType: 'taskList',
          entityId: list.id,
          changes: { 
            ...list, 
            userId,
            // 强制设置为非激活状态，避免与云端的唯一激活约束冲突
            isActive: 0
          }
        });
      }
      
      // 任务队列项
      for (const task of nullUserIdTasks) {
        queueItems.push({
          action: 'add',
          entityType: 'task',
          entityId: task.id,
          changes: { ...task, userId }
        });
      }
      
      await queueManager.batchAddToQueue(queueItems);
      
      console.log('[UnifiedStorage] Local data added to sync queue');
    } catch (error) {
      console.error('[UnifiedStorage] Error processing null userId data:', error);
      // 不抛出错误，避免阻塞登录流程
    }
  },
  
  // 拉取远程数据（只负责获取数据）
  pullRemoteData: async (userId) => {
    const lastPullTime = localStorage.getItem(`last_pull_${userId}`) || '1970-01-01';
    
    try {
      console.log(`[UnifiedStorage] Pulling remote data since ${lastPullTime}`);
      
      // 使用 supabase-db 中的函数获取更新的数据
      const [remoteTasks, remoteTaskLists] = await Promise.all([
        getUpdatedTasks(userId, lastPullTime),
        getUpdatedTaskLists(userId, lastPullTime)
      ]);
      
      console.log(`[UnifiedStorage] Pulled ${remoteTasks.length} tasks, ${remoteTaskLists.length} task lists`);
      
      // 返回获取的数据
      return {
        tasks: remoteTasks || [],
        taskLists: remoteTaskLists || [],
        userId,
        lastPullTime: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[UnifiedStorage] Pull remote data failed:', error);
      // 返回空数据，不阻止后续流程
      return {
        tasks: [],
        taskLists: [],
        userId,
        error
      };
    }
  },
  
  // 应用远程数据到本地（包含冲突处理）
  applyRemoteData: async (remoteData) => {
    if (!remoteData || remoteData.error) {
      console.log('[UnifiedStorage] No remote data to apply');
      return;
    }
    
    try {
      console.log('[UnifiedStorage] Applying remote data...');
      
      // 1. 先处理任务列表（避免外键约束）
      for (const remoteList of remoteData.taskLists) {
        await get().applyRemoteChange('taskList', remoteList);
      }
      
      // 2. 再处理任务
      for (const remoteTask of remoteData.tasks) {
        await get().applyRemoteChange('task', remoteTask);
      }
      
      // 3. 更新拉取时间
      if (remoteData.userId && remoteData.lastPullTime) {
        localStorage.setItem(`last_pull_${remoteData.userId}`, remoteData.lastPullTime);
      }
      
      console.log('[UnifiedStorage] Remote data applied successfully');
      
    } catch (error) {
      console.error('[UnifiedStorage] Apply remote data failed:', error);
      throw error;
    }
  },
  
  // 应用单个远程变更（核心冲突处理）
  applyRemoteChange: async (entityType, remoteData) => {
    // 注意：从 supabase-db 获取的数据已经是 IndexedDB 格式
    const localFormat = remoteData;
    
    // 获取本地数据
    const localData = entityType === 'task' 
      ? await dbManager.getTask(localFormat.id)
      : await dbManager.getTaskList(localFormat.id);
    
    if (!localData) {
      // 场景1：本地不存在，直接插入
      if (entityType === 'task') {
        await dbManager.insertTask(localFormat);
      } else {
        await dbManager.insertTaskList(localFormat);
      }
      return;
    }
    
    // 场景2：本地存在，进行冲突检测
    // 使用 normalizeToUTC 确保时区一致
    const localTime = normalizeToUTC(localData.updatedAt);
    const remoteTime = normalizeToUTC(localFormat.updatedAt);
    
    if (remoteTime > localTime) {
      // 云端更新，使用云端数据
      if (entityType === 'task') {
        await dbManager.updateTask(localFormat.id, localFormat);
      } else {
        await dbManager.updateTaskList(localFormat.id, localFormat);
      }
      
      // 关键：清理同步队列中的无效操作
      await get().clearInvalidQueueItems(localFormat.id);
    }
    // 如果本地更新，保持本地数据，等待队列推送
  },
  
  // 清理无效的队列项
  clearInvalidQueueItems: async (entityId) => {
    const pendingItems = await queueManager.getPendingItems();
    
    for (const item of pendingItems) {
      if (item.entityId === entityId) {
        // 删除该实体的所有待处理操作
        await queueManager.deleteQueueItem(item.id);
        console.log(`[UnifiedStorage] Cleared invalid queue item: ${item.id} (entity: ${entityId})`);
      }
    }
  },
  
  // 检查任务列表是否已在云端
  checkTaskListInCloud: async (listId) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('task_lists')
        .select('id')
        .eq('id', listId)
        .single();
      
      // 如果查询成功且有数据，说明任务列表已同步
      return !error && !!data;
    } catch (error) {
      console.error('[UnifiedStorage] Error checking task list in cloud:', error);
      return false; // 出错时保守处理，返回 false
    }
  },
  
  // 检查任务是否已在云端
  checkTaskInCloud: async (taskId) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .single();
      
      // 如果查询成功且有数据，说明任务已同步
      return !error && !!data;
    } catch (error) {
      console.error('[UnifiedStorage] Error checking task in cloud:', error);
      return false; // 出错时保守处理，返回 false
    }
  }
}));