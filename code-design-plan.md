# iTodo 混合存储代码设计方案

## 1. MVP简化版设计理念

### 核心设计原则

基于MVP(最小可行产品)理念，采用简化的同步策略，将复杂性暴露给用户而非隐藏在系统中：

#### 1. **本地优先 + 持久化队列**
- **本地优先**: 所有操作首先在本地 IndexedDB 中完成，确保即时响应
- **离线工作**: 无网络时应用完全可用，用户无感知
- **同步队列**: 使用IndexedDB持久化同步队列，避免数据丢失
- **快速响应**: UI 更新基于本地数据，不等待网络请求

#### 2. **事件驱动同步**
- **操作触发**: 每次用户操作后立即尝试同步（非定期轮询）
- **队列处理**: 同步失败的操作进入持久化队列
- **网络恢复**: 网络重连时自动处理队列
- **后台同步**: 同步过程不阻塞用户操作

#### 3. **用户透明的冲突处理**
- **LWW策略**: 采用Last-Write-Wins（最后写入获胜）基于updated_at时间戳
- **简单覆盖**: 不进行复杂的字段级合并，直接覆盖
- **用户可控**: 多设备冲突的数据丢失风险由用户承担（MVP阶段可接受）

#### 4. **用户界面驱动的异常处理**
- **透明状态**: 所有同步状态对用户可见
- **手动干预**: 异常情况通过用户界面让用户选择处理方式
- **同步历史**: 提供同步进度弹窗，显示成功/失败记录
- **手动清理**: 用户可以手动删除已完成或失败的同步项

### MVP架构目标
- **未登录用户**: 保持现有体验，仅使用 IndexedDB 本地存储
- **已登录用户**: 本地存储 + 持久化同步队列 + 云端同步
- **简化同步**: 操作后立即尝试同步，失败时进入队列
- **用户可控**: 通过同步进度界面让用户管理同步状态
- **墓碑模式**: 永久删除使用标记而非物理删除，确保同步一致性
- **快速实现**: 避免复杂的冲突解决和智能合并机制

## 2. 架构设计

### 2.1 整体架构图 (MVP版本)
```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Components)                    │
├─────────────────────────────────────────────────────────┤
│               Hook 层 (useTasks, useTaskLists)           │
├─────────────────────────────────────────────────────────┤
│                   SimpleSyncQueue                        │
│                    (统一调度层)                           │
├─────────────────────────────────────────────────────────┤
│  IndexedDBManager  │  SyncManager  │   QueueManager      │
│   (本地存储管理)    │  (同步逻辑)    │   (队列管理)        │
├───────────────────────┬─────────────────────────────────┤
│   IndexedDB 层         │        Supabase 层              │
│   (本地存储 + 同步队列)  │        (云端存储)                │
└───────────────────────┴─────────────────────────────────┘
```

### 2.2 MVP简化存储策略

| 用户状态 | 操作类型 | IndexedDB | SyncQueue | Supabase | 执行顺序 | 说明 |
|---------|---------|-----------|-----------|----------|---------|------|
| 未登录 | 读取 | ✅ | ❌ | ❌ | 1. 本地读取 | 仅从本地读取 |
| 未登录 | 写入 | ✅ | ❌ | ❌ | 1. 本地写入 | 仅写入本地 |
| 已登录 | 读取 | ✅ | ❌ | ❌ | 1. 本地读取 | **本地优先**，不等待云端 |
| 已登录 | 写入 | ✅ 先执行 | ✅ 加入 | ✅ 尝试 | 1. 本地写入<br>2. 加入队列<br>3. 立即同步 | **即时响应**，失败时队列保护 |
| 网络异常 | 读取 | ✅ | ❌ | ❌ | 1. 本地读取 | 完全依赖本地数据 |
| 网络异常 | 写入 | ✅ | ✅ | ❌ | 1. 本地写入<br>2. 加入队列 | 写入队列，网络恢复后处理 |
| 永久删除 | 标记删除 | ✅ | ✅ | ✅ | 1. 本地标记 deleted=2<br>2. 加入同步队列 | 使用墓碑模式，队列保证同步 |
| 删除列表 | 级联标记 | ✅ | ✅ | ✅ | 1. 标记列表deleted=2<br>2. 标记所有任务deleted=2<br>3. 都进入同步队列 | 外键约束防止物理删除 |

### 2.3 MVP简化版同步流程

基于MVP理念，采用简化的同步策略，将复杂性暴露给用户而非隐藏在系统中：

- **简单状态管理**：pending -> processing -> completed/failed
- **用户界面驱动**：异常处理通过界面让用户选择
- **透明同步历史**：所有同步记录用户可见和控制
- **LWW冲突解决**：使用最后写入获胜策略，暂不处理复杂冲突

#### 离线可用 (Offline-First)
```javascript
// 简化版同步实现
async function addTask(taskData) {
  // 1. 立即写入本地 (保证离线可用)
  const localTask = await addTaskToIndexedDB(taskData);
  
  // 2. 立即返回结果 (快速响应)
  updateUI(localTask);
  
  // 3. 加入同步队列 (不阻塞用户)
  if (isAuthenticated) {
    await addToSyncQueue({
      action: 'add',
      entityType: 'task',
      entityId: localTask.id,
      data: localTask
    });
    
    // 立即尝试处理队列
    processQueueInBackground();
  }
  
  return localTask;
}
```


#### 冲突最小化 (Auto-Merge) - 时区安全的 LWW
```javascript
// 自动冲突解决机制（时区统一的 Last-Write-Wins）
async function resolveConflict(localData, remoteData) {
  // 关键：确保时间戳比较在统一时区下进行
  const localTimestamp = normalizeToUTC(localData.updatedAt);
  const remoteTimestamp = normalizeToUTC(remoteData.updated_at);
  
  // 1. 时间戳比较 - 最后写入获胜（UTC时间比较）
  if (localTimestamp > remoteTimestamp) {
    return { resolved: localData, strategy: 'local-wins' };
  }
  
  if (remoteTimestamp > localTimestamp) {
    return { resolved: remoteData, strategy: 'remote-wins' };
  }
  
  // 2. 智能字段合并 (相同时间戳时)
  const merged = {
    ...localData,
    ...remoteData,
    // 保留最新的字段值
    text: remoteData.text || localData.text,
    completed: remoteData.completed !== undefined ? remoteData.completed : localData.completed,
    updatedAt: Math.max(localTimestamp, remoteTimestamp)
  };
  
  return { resolved: merged, strategy: 'auto-merge' };
}

// 时区统一工具函数
function normalizeToUTC(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime(); // 返回UTC毫秒数
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime(); // ISO字符串自动解析为UTC
  }
  return timestamp; // 假设已经是毫秒时间戳
}

// 确保本地数据库写入使用UTC时间
function createTaskWithUTCTimestamp(taskData) {
  const now = new Date(); // JavaScript Date对象内部就是UTC
  return {
    ...taskData,
    createdAt: now,
    updatedAt: now
  };
}
```


## 3. 核心模块设计

### 3.1 ID 生成器 (UUID v4)

#### 文件位置
`src/lib/indexeddb.js` 中的 `generateId` 函数

#### 设计原理
- **使用 UUID v4**：本地和云端使用完全相同的 ID
- **标准格式**：`550e8400-e29b-41d4-a716-446655440000`（36字符）
- **零转换成本**：无需任何ID映射或转换
- **极高唯一性**：碰撞概率接近零

#### 实现代码
```javascript
// 生成唯一ID (使用UUID v4)
export function generateId() {
  // 使用浏览器原生 crypto API 生成 UUID v4
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 降级方案（旧浏览器）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### 3.2 模块化架构设计

#### 模块职责划分

##### 3.2.1 IndexedDBManager
**文件位置**: `src/lib/indexeddb-manager.js`
**职责**:
- 封装所有IndexedDB操作
- 提供任务和任务列表的CRUD接口
- 管理数据库升级和初始化
- 处理本地数据查询和排序

##### 3.2.2 QueueManager
**文件位置**: `src/lib/queue-manager.js`
**职责**:
- 管理同步队列的增删改查
- 维护队列项的状态转换
- 提供队列查询接口（按状态、时间等）
- 处理队列项的批量操作

**IndexedDB 同步队列创建**:
```javascript
// 在 src/lib/indexeddb.js 中添加
const DB_VERSION = 4; // 从3升级到4  

const STORES = {
  TASKS: "tasks",
  TASK_LISTS: "taskLists",
  SYNC_QUEUE: "syncQueue",  // 新增
};

// 在 initDB 函数中添加
if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
  const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
    keyPath: "id",
  });
  queueStore.createIndex("status", "status");
  queueStore.createIndex("createdAt", "createdAt");
  queueStore.createIndex("entityType", "entityType");
  queueStore.createIndex("action", "action");
}
```

**队列项状态转换**:
```
pending    → processing → completed
    ↓           ↓
    └─── failed ←───┘
    
- pending: 刚创建，等待处理
- processing: 正在同步中
- completed: 同步成功
- failed: 同步失败，需要用户干预
```

##### 3.2.3 SyncManager
**文件位置**: `src/lib/sync-manager.js`
**职责**:
- 处理与Supabase的数据同步
- 执行同步重试逻辑
- 管理网络状态监听
- 处理数据格式转换

##### 3.2.4 SimpleSyncQueue（协调层）
**文件位置**: `src/lib/simple-sync-queue.js`
**职责**:
- 协调三个模块的工作
- 提供统一的对外接口
- 管理认证状态
- 处理用户登录/登出事件

#### 模块实现方式

##### IndexedDBManager - 本地存储管理
```javascript
// src/lib/indexeddb-manager.js
// 直接导出现有的IndexedDB函数，保持一致性
export {
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
  moveTask,
  reorderTasks,
  getAllTaskLists,
  addTaskList,
  updateTaskList,
  deleteTaskList,
  setActiveTaskList
} from './indexeddb';
```

##### QueueManager - 队列管理
```javascript
// src/lib/queue-manager.js
import { openDB } from 'idb';
import { generateId } from './indexeddb';

// 添加操作到队列
export async function addToQueue(operation) {
  const queueItem = {
    id: generateId(),
    status: 'pending',
    action: operation.action,
    entityType: operation.entityType,
    entityId: operation.entityId,
    changes: operation.changes,
    createdAt: new Date(),
    retryCount: 0
  };
  
  const db = await openDB('iTodoApp', 4);
  return await db.add('syncQueue', queueItem);
}

// 获取待处理项
export async function getPendingItems() {
  const db = await openDB('iTodoApp', 4);
  return await db.getAllFromIndex('syncQueue', 'status', 'pending');
}

// 更新队列项状态
export async function updateItemStatus(itemId, status, error = null) {
  const db = await openDB('iTodoApp', 4);
  const item = await db.get('syncQueue', itemId);
  if (item) {
    item.status = status;
    if (error) item.error = error;
    if (status === 'completed') item.completedAt = new Date();
    return await db.put('syncQueue', item);
  }
}

// 更新队列项
export async function updateItem(itemId, updates) {
  const db = await openDB('iTodoApp', 4);
  const item = await db.get('syncQueue', itemId);
  if (item) {
    Object.assign(item, updates);
    return await db.put('syncQueue', item);
  }
}

// 获取同步状态汇总
export async function getSyncStatus() {
  const db = await openDB('iTodoApp', 4);
  const [pending, processing, failed, completed] = await Promise.all([
    db.getAllFromIndex('syncQueue', 'status', 'pending'),
    db.getAllFromIndex('syncQueue', 'status', 'processing'),
    db.getAllFromIndex('syncQueue', 'status', 'failed'),
    db.getAllFromIndex('syncQueue', 'status', 'completed')
  ]);
  
  return { 
    pending, 
    processing, 
    failed, 
    completed  // 返回所有记录，让前端决定如何显示
  };
}

// 删除队列项
export async function deleteQueueItem(itemId) {
  const db = await openDB('iTodoApp', 4);
  return await db.delete('syncQueue', itemId);
}

// 常用查询操作示例
export async function getQueueOperations() {
  const db = await openDB('iTodoApp', 4);
  
  // 获取待处理的同步项
  const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');
  
  // 获取失败的同步项
  const failedItems = await db.getAllFromIndex('syncQueue', 'status', 'failed');
  
  // 按时间获取最近的同步记录
  const recentItems = await db.getAllFromIndex('syncQueue', 'createdAt');
  recentItems.reverse(); // 最新的在前
  
  // 按操作类型过滤
  const addOperations = await db.getAllFromIndex('syncQueue', 'action', 'add');
  
  return { pendingItems, failedItems, recentItems, addOperations };
}
```

**数据清理策略**:
- **成功记录**: 保留所有，由用户决定是否删除
- **失败记录**: 保留所有，由用户决定是否删除
- **超时记录**: 保持 pending 状态，不自动转换
- **存储空间估算**: 单个队列项约200字节，1000条记录约200KB
- **用户控制**: 所有数据清理操作都由用户手动触发，系统不做自动清理

##### SyncManager - 同步逻辑
```javascript
// src/lib/sync-manager.js
import { 
  addSupabaseTask, 
  updateSupabaseTask, 
  deleteSupabaseTask 
} from './supabase-db';

// 模块级状态
let isProcessing = false;
let networkRestoreCallbacks = [];

// 状态管理
export function setProcessing(value) {
  isProcessing = value;
}

export function getProcessing() {
  return isProcessing;
}

// 执行同步操作
export async function syncTask(action, entityId, changes) {
  switch (action) {
    case 'add':
      return await addSupabaseTask(changes);
    case 'update':
      return await updateSupabaseTask(entityId, changes);
    case 'delete':
      return await deleteSupabaseTask(entityId);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// 判断错误是否可重试
export function isRetryableError(error) {
  return error.code === 'NETWORK_ERROR' || 
         (error.status >= 500 && error.status < 600);
}

// 注册网络恢复回调
export function onNetworkRestore(callback) {
  networkRestoreCallbacks.push(callback);
}

// 初始化网络监听
export function initNetworkListener() {
  window.addEventListener('online', () => {
    networkRestoreCallbacks.forEach(callback => callback());
  });
}
```

##### SimpleSyncQueue - 使用Zustand Store
```javascript
// src/lib/simple-sync-queue.js
import { create } from 'zustand';
import * as dbManager from './indexeddb-manager';
import * as queueManager from './queue-manager';
import * as syncManager from './sync-manager';
import { checkMigrationNeeded, migrateLocalDataToSupabase } from './data-migration';

export const useSyncQueue = create((set, get) => ({
  // 初始化
  initialize: (authStore) => {
    // 监听认证状态变化
    authStore.subscribe((state, prevState) => {
      if (state.user && !prevState.user) {
        get().onUserLogin(state.user);
      }
    });
    
    // 设置网络恢复监听
    syncManager.initNetworkListener();
    syncManager.onNetworkRestore(() => {
      if (authStore.isAuthenticated()) {
        get().processQueue();
      }
    });
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
    // 1. 立即写入本地
    const localTask = await dbManager.addTask(taskData);
    
    // 2. 如果已登录，加入同步队列
    if (authStore.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'add',
        entityType: 'task',
        entityId: localTask.id,
        changes: localTask
      });
      
      // 3. 立即尝试同步
      get().processQueue(authStore);
    }
    
    return localTask;
  },

  updateTask: async (id, updates, authStore) => {
    // 1. 立即更新本地
    const updatedTask = await dbManager.updateTask(id, updates);
    
    // 2. 如果已登录，加入同步队列
    if (authStore.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'task',
        entityId: id,
        changes: updates
      });
      
      get().processQueue(authStore);
    }
    
    return updatedTask;
  },

  deleteTask: async (id, permanent, authStore) => {
    // 1. 更新本地删除状态
    const deleteStatus = permanent ? 2 : 1;
    const deletedTask = await dbManager.updateTask(id, { deleted: deleteStatus });
    
    // 2. 如果已登录，同步删除状态
    if (authStore.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'task',
        entityId: id,
        changes: { deleted: deleteStatus }
      });
      
      get().processQueue(authStore);
    }
    
    return deletedTask;
  },

  deleteTaskList: async (listId, authStore) => {
    // 1. 先获取该列表下的所有任务
    const tasks = await dbManager.getAllTasks(listId);
    
    // 2. 将所有任务标记为墓碑状态
    for (const task of tasks) {
      await dbManager.updateTask(task.id, { deleted: 2 });
      
      if (authStore.isAuthenticated()) {
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
    if (authStore.isAuthenticated()) {
      await queueManager.addToQueue({
        action: 'update',
        entityType: 'taskList',
        entityId: listId,
        changes: { deleted: 2 }
      });
      
      get().processQueue(authStore);
    }
    
    return deletedList;
  },

  // 队列处理
  processQueue: async (authStore) => {
    if (syncManager.getProcessing() || !navigator.onLine || !authStore.isAuthenticated()) {
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
      // 更新状态为处理中
      await queueManager.updateItemStatus(item.id, 'processing');
      
      // 执行同步操作
      await syncManager.syncTask(item.action, item.entityId, item.changes);
      
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
  retryFailedItem: async (itemId, authStore) => {
    await queueManager.updateItem(itemId, {
      status: 'pending',
      retryCount: 0
    });
    await get().processQueue(authStore);
  },

  deleteQueueItem: async (itemId) => {
    return await queueManager.deleteQueueItem(itemId);
  },

  // 用户登录处理
  onUserLogin: async (user) => {
    // 检查是否需要数据迁移
    const needsMigration = await checkMigrationNeeded(user.id);
    if (needsMigration) {
      await migrateLocalDataToSupabase(user.id);
    }
    
    // 关键：先拉取云端数据
    await get().pullRemoteChanges(user.id);
    
    // 然后处理积压的同步队列
    const authStore = useAuthStore.getState();
    await get().processQueue(authStore);
  },
  
  // 拉取远程变更（含冲突处理）
  pullRemoteChanges: async (userId) => {
    const lastPullTime = localStorage.getItem(`last_pull_${userId}`) || '1970-01-01';
    
    try {
      // 1. 获取云端更新的任务
      const { data: remoteTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastPullTime)
        .order('updated_at', { ascending: true });
        
      if (tasksError) throw tasksError;
      
      // 2. 获取云端更新的任务列表
      const { data: remoteTaskLists, error: listsError } = await supabase
        .from('task_lists')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastPullTime)
        .order('updated_at', { ascending: true });
        
      if (listsError) throw listsError;
      
      // 3. 先处理任务列表（避免外键约束）
      for (const remoteList of remoteTaskLists || []) {
        await get().applyRemoteChange('taskList', remoteList);
      }
      
      // 4. 再处理任务
      for (const remoteTask of remoteTasks || []) {
        await get().applyRemoteChange('task', remoteTask);
      }
      
      // 5. 更新拉取时间
      localStorage.setItem(`last_pull_${userId}`, new Date().toISOString());
      
    } catch (error) {
      console.error('Pull remote changes failed:', error);
      // 不阻止后续的队列处理
    }
  },
  
  // 应用远程变更（核心冲突处理）
  applyRemoteChange: async (entityType, remoteData) => {
    // 转换数据格式
    const localFormat = convertSupabaseToIndexedDB(remoteData);
    
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
    const localTime = normalizeToUTC(localData.updatedAt);
    const remoteTime = normalizeToUTC(remoteData.updated_at);
    
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
        console.log(`清理无效队列项: ${item.id} (实体: ${entityId})`);
      }
    }
  }
}))
```

### 3.3 Supabase 数据层

#### 文件位置
`src/lib/supabase-db.js`

#### 核心职责
- 封装 Supabase 数据库操作
- 处理数据格式转换
- 实现错误处理和重试机制

#### 接口设计
```javascript
// 任务操作 (自动获取当前用户ID + 应用层验证)
export async function getSupabaseTasks(listId, options = {})
export async function addSupabaseTask(taskData)
export async function updateSupabaseTask(id, updates) 
export async function deleteSupabaseTask(id, permanent = false)  // 支持软删除和永久删除
export async function moveSupabaseTask(taskId, fromQuadrant, toQuadrant, newOrder)
export async function reorderSupabaseTasks(tasks)

// 应用层数据一致性验证
export async function validateTaskListOwnership(listId, userId)
export async function validateTaskOwnership(taskId, userId)

// 任务列表操作 (自动获取当前用户ID)
export async function getSupabaseTaskLists()
export async function addSupabaseTaskList(name, options)
export async function updateSupabaseTaskList(id, updates)
export async function deleteSupabaseTaskList(id)
export async function setSupabaseActiveTaskList(id)

// 批量操作 (包含用户ID)
export async function batchInsertTasks(tasks, userId)
export async function batchInsertTaskLists(taskLists, userId)

// 用户数据管理
export async function getUserDataExists(userId)  // 检查用户数据是否存在

// 工具函数
export function convertIndexedDBToSupabase(data, userId)
export function convertSupabaseToIndexedDB(data)

// 注意：转换函数需要处理task_lists的deleted字段
// convertIndexedDBToSupabase: deleted默认为0
// convertSupabaseToIndexedDB: 保留deleted字段值

// 应用层数据一致性验证实现
export async function validateTaskListOwnership(listId, userId) {
  const { data, error } = await supabase
    .from('task_lists')
    .select('user_id')
    .eq('id', listId)
    .single();
    
  if (error) throw new Error(`Task list not found: ${listId}`);
  if (data.user_id !== userId) {
    throw new Error(`Access denied: Task list ${listId} does not belong to user ${userId}`);
  }
  
  return true;
}

export async function validateTaskOwnership(taskId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single();
    
  if (error) throw new Error(`Task not found: ${taskId}`);
  if (data.user_id !== userId) {
    throw new Error(`Access denied: Task ${taskId} does not belong to user ${userId}`);
  }
  
  return true;
}

// 增强的任务添加函数 - 包含应用层验证
export async function addSupabaseTaskWithValidation(taskData) {
  const userId = (await supabase.auth.getUser()).data.user.id;
  
  // 1. 验证任务列表归属
  await validateTaskListOwnership(taskData.list_id, userId);
  
  // 2. 确保 user_id 一致性
  const validatedTaskData = {
    ...taskData,
    user_id: userId // 强制设置为当前用户ID
  };
  
  // 3. 执行插入
  const { data, error } = await supabase
    .from('tasks')
    .insert(validatedTaskData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

### 3.4 时区统一处理

#### 时区问题的重要性
在多设备、多时区的环境下，时间戳不统一会导致 LWW (Last-Write-Wins) 冲突解决错误：

```javascript
// 危险：时区不统一的场景
// 用户在北京（UTC+8）: 2024-01-15 14:00:00 (本地时间)
// 用户在纽约（UTC-5）: 2024-01-15 01:00:00 (本地时间)
// 实际上是同一时刻，但比较时可能出错！
```

#### 时区统一策略
1. **服务端强制 UTC**: 所有数据库写入使用 `NOW()` (UTC)
2. **客户端标准化**: JavaScript Date 对象内部就是 UTC
3. **传输格式统一**: 使用 ISO 8601 格式 (`toISOString()`)
4. **比较时统一**: 冲突解决时转换为相同格式比较

#### 实现细节
```javascript
// 正确的时间戳处理
// 创建UTC时间戳
export function nowUTC() {
  return new Date(); // JavaScript Date 内部就是 UTC
}

// 标准化时间戳为UTC毫秒数
export function toUTCMillis(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  return timestamp;
}

// 安全的时间戳比较
export function compareTimestamps(timestamp1, timestamp2) {
  const t1 = toUTCMillis(timestamp1);
  const t2 = toUTCMillis(timestamp2);
  return t1 - t2; // > 0 表示 t1 更新
}

// 在数据操作中使用
function updateTaskWithTimestamp(taskData) {
  return {
    ...taskData,
    updatedAt: nowUTC() // 确保使用 UTC
  };
}
```

### 3.5 同步机制设计

#### 完整同步流程：Pull-Conflict-Push

**核心原则**：先拉取、处理冲突、再推送，确保数据一致性。

##### 同步时序图
```
用户登录 → 数据迁移（如需） → Pull（拉取） → Conflict（冲突处理） → Push（推送）
                               ↓                      ↓
                          从云端获取更新        清理无效队列项
```

##### 详细流程

1. **Pull阶段：拉取云端更新**
   - 基于 `last_pull_time` 获取增量数据
   - 先处理 task_lists（避免外键约束）
   - 再处理 tasks
   - 更新拉取时间戳

2. **Conflict阶段：冲突检测与处理**
   - 云端新数据 → 直接插入本地
   - 云端更新数据 → LWW 冲突解决
   - 若云端覆盖本地 → **清理相关队列项**

3. **Push阶段：处理同步队列**
   - 按队列顺序推送操作
   - 已被清理的队列项自动跳过
   - 成功后标记为 completed

##### Pull-Conflict-Push 核心实现

1. **Pull 阶段 - 获取云端更新**:
```javascript
async function pullRemoteChanges(userId) {
  const lastPullTime = localStorage.getItem(`last_pull_${userId}`) || '1970-01-01';
  
  // 使用 Supabase 查询增量数据
  const { data: remoteTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastPullTime)  // 只获取更新的数据
    .order('updated_at', { ascending: true });
    
  // 处理每一条远程数据
  for (const remoteData of remoteTasks || []) {
    await applyRemoteChange('task', remoteData);
  }
  
  localStorage.setItem(`last_pull_${userId}`, new Date().toISOString());
}
```

2. **Conflict 阶段 - 冲突处理与队列清理**:
```javascript
async function applyRemoteChange(entityType, remoteData) {
  // 转换数据格式（下划线 → 驼峰）
  const localFormat = convertSupabaseToIndexedDB(remoteData);
  
  // 获取本地数据
  const localData = await getLocalData(entityType, localFormat.id);
  
  if (!localData) {
    // 无冲突：直接插入
    await insertLocalData(entityType, localFormat);
    return;
  }
  
  // 冲突检测：基于时间戳
  const localTime = new Date(localData.updatedAt).getTime();
  const remoteTime = new Date(remoteData.updated_at).getTime();
  
  if (remoteTime > localTime) {
    // 云端较新，覆盖本地
    await updateLocalData(entityType, localFormat.id, localFormat);
    
    // 关键：清理被覆盖实体的同步队列项
    await clearInvalidQueueItems(localFormat.id);
  }
  // 本地较新：保留本地，等待 Push
}

// 清理无效队列项
async function clearInvalidQueueItems(entityId) {
  const db = await openDB('iTodoApp', 4);
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  
  // 查找该实体的所有 pending 队列项
  const index = store.index('status');
  const pendingItems = await index.getAll('pending');
  
  // 删除相关队列项
  for (const item of pendingItems) {
    if (item.entityId === entityId) {
      await store.delete(item.id);
      console.log(`清理无效队列项: ${item.id}`);
    }
  }
  
  await tx.done;
}
```

3. **为什么要清理队列项？**

场景示例：
1. 本地：任务 A 的文本 = "TODO"，更新时间 10:00
2. 队列：有一个待推送的操作，要将文本改为 "TODO"
3. 云端：任务 A 的文本 = "DONE"，更新时间 10:30（较新）
4. Pull 后：本地变为 "DONE"
5. 如果不清理队列：Push 时会把 "DONE" 改回 "TODO"（错误）
6. 清理队列后：避免了这个问题

**数据完整性保证**:
- **时间戳一致性**：所有时间戳统一使用 UTC
- **队列原子性**：使用 IndexedDB 事务保证操作原子性
- **冲突解决确定性**：LWW 策略保证结果可预测
- **队列清理及时性**：避免过时操作覆盖新数据

#### MVP简化版同步时机策略

**采用事件驱动 + 登录触发的同步策略**：

1. **用户操作后立即同步**: 每次用户新增、编辑、删除任务或任务列表后立即尝试同步
   - ✅ 即时性：用户感知到的是即时同步
   - ✅ 减少积压：避免大量操作积压后的批量同步
   - ✅ 网络优化：失败时进入队列，成功时无额外开销

2. **用户登录时自动同步**: 用户登录成功后先拉取再推送
   - ✅ 先拉取：获取其他设备的最新变更
   - ✅ 冲突处理：清理被覆盖的队列项
   - ✅ 再推送：将本地变更同步到云端

3. **网络恢复时自动同步**: 检测到网络恢复时自动处理待同步队列
   - ✅ 智能恢复：无需用户手动触发
   - ✅ 后台处理：不干扰用户正常操作

4. **不使用定期轮询**: 避免不必要的网络请求和电池消耗
   - ❌ 不使用每5分钟轮询策略
   - ❌ 不使用应用启动时的主动检查
   - ✅ 完全基于用户行为和网络状态的被动同步

##### 同步时机实现代码

1. **用户操作后立即同步（主要触发机制）**:
```javascript
// 所有用户操作后的同步流程
async function handleUserOperation(operation) {
  // 1. 立即写入本地 IndexedDB
  const localResult = await executeLocalOperation(operation);
  
  // 2. 立即更新 UI
  updateUI(localResult);
  
  // 3. 如果已登录，加入同步队列
  if (isAuthenticated()) {
    await addToSyncQueue({
      action: operation.type,
      entityType: operation.entityType,
      entityId: operation.entityId,
      data: operation.data
    });
    
    // 4. 立即尝试同步（非阻塞）
    processQueueInBackground();
  }
  
  return localResult;
}

// 支持的操作类型
const SYNC_TRIGGERS = {
  ADD_TASK: 'add_task',
  UPDATE_TASK: 'update_task', 
  DELETE_TASK: 'delete_task',
  ADD_TASK_LIST: 'add_task_list',
  UPDATE_TASK_LIST: 'update_task_list',
  DELETE_TASK_LIST: 'delete_task_list'
};
```

2. **用户登录时自动同步（次要触发机制）**:
```javascript
// 登录成功后的同步流程
async function onLoginSuccess(user) {
  // 1. 初始化同步队列管理器
  await initSyncQueue(user.id);
  
  // 2. 检查是否需要数据迁移
  const needsMigration = await checkMigrationNeeded(user.id);
  if (needsMigration) {
    await migrateLocalDataToSupabase(user.id);
  }
  
  // 3. 处理未同步的本地变更
  await processExistingSyncQueue();
}
```

3. **网络恢复时自动同步（辅助触发机制）**:
```javascript
// 网络状态监听
window.addEventListener('online', async () => {
  if (isAuthenticated()) {
    console.log('网络恢复，开始处理同步队列...');
    await processExistingSyncQueue();
  }
});

// 检测网络状态
function isOnline() {
  return navigator.onLine;
}
```

##### 同步时机总结
```javascript
// MVP 简化版同步触发条件
const SYNC_CONDITIONS = {
  // 主要触发
  USER_OPERATION: {
    when: '用户执行 CRUD 操作后',
    action: '立即尝试同步',
    fallback: '失败时进入队列'
  },
  
  // 次要触发  
  USER_LOGIN: {
    when: '用户登录成功后',
    action: '先拉取云端数据，再处理本地队列',
    includes: '数据迁移 + Pull + Conflict + Push'
  },
  
  // 辅助触发
  NETWORK_RECOVERY: {
    when: '网络从离线恢复在线',
    action: '自动处理积压队列',
    condition: '仅当已登录时'
  }
};
```

#### 简化同步策略
```javascript
// 队列项状态（简化版）
const QUEUE_STATUS = {
  PENDING: 'pending',       // 等待同步
  PROCESSING: 'processing', // 同步中
  COMPLETED: 'completed',   // 同步完成
  FAILED: 'failed'          // 同步失败
};

// 冲突解决策略（MVP版）
const CONFLICT_RESOLUTION = {
  LAST_WRITE_WINS: 'lww'    // 最后写入获胜（基于updated_at）
};

// 队列项数据结构
interface QueueItem {
  id: string;               // 队列项唯一ID
  status: QUEUE_STATUS;     // 当前状态
  action: string;           // 操作类型：add/update/delete
  entityType: string;       // 实体类型：task/taskList
  entityId: string;         // 实体UUID
  data: object;             // 操作数据
  createdAt: Date;          // 创建时间
  completedAt: Date;        // 完成时间
  retryCount: number;       // 重试次数
  error: string;            // 错误信息
}
```

#### MVP失败同步处理策略

**用户界面驱动的异常处理方式**：

**设计理念**：将复杂性透明化，由用户主动管理同步异常，而非系统自动处理。

1. **自动重试机制（有限重试）**：
```javascript
const ERROR_TYPES = {
  NETWORK: 'network',     // 网络错误，可重试
  AUTH: 'auth',           // 认证错误，不自动重试
  VALIDATION: 'validation', // 数据验证错误，不可重试
  SERVER: 'server'        // 服务器错误，可重试
};

// 指数退避重试（最多3次）
function calculateRetryDelay(retryCount) {
  const baseDelay = 1000; // 1秒
  const maxDelay = 8000;   // 8秒（不超过用户忍耐阈值）
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  return delay;
}

const MAX_RETRY_COUNT = 3; // 最多自动重试3次

// 重试策略表
const RETRY_POLICIES = {
  [ERROR_TYPES.NETWORK]: { autoRetry: true, maxRetries: 3 },
  [ERROR_TYPES.SERVER]: { autoRetry: true, maxRetries: 3 },
  [ERROR_TYPES.AUTH]: { autoRetry: false, maxRetries: 0 },
  [ERROR_TYPES.VALIDATION]: { autoRetry: false, maxRetries: 0 }
};
```

2. **失败后用户干预**：
   - 超过最大重试次数后，状态变为 `failed`
   - 失败项在同步进度弹窗中显示红色错误状态
   - 用户可以查看具体错误原因
   - 用户可以选择手动重试或删除失败项

3. **用户控制机制（关键特性）**：
```javascript
// 用户可执行的操作
const USER_ACTIONS = {
  RETRY_SINGLE: 'retry',           // 重试单个失败项
  RETRY_ALL: 'retryAll',           // 重试所有失败项
  DELETE_SINGLE: 'delete',         // 删除单个失败项
  CLEAR_FAILED: 'clearFailed',     // 清空所有失败记录
  CLEAR_COMPLETED: 'clearCompleted' // 清空所有已完成记录
};
```
   - **手动重试**：用户点击"重试"按钮重新尝试同步
   - **批量重试**："重试全部"按钮处理所有失败项
   - **删除失败项**：用户可以放弃某个同步操作
   - **清空失败记录**：一键清理所有失败的同步记录

4. **透明化原则（MVP核心）**：
   - ✅ **所有同步状态对用户可见**：正在处理、等待、失败、已完成
   - ✅ **失败原因可见**：网络错误、认证失败、服务器错误等
   - ✅ **用户自主决策**：系统不作任何隐藏的自动处理
   - ✅ **低心智负担**：用户不需要理解复杂的冲突解决机制

#### 数据同步流程
```javascript
async function syncData() {
  // 1. 检查网络状态
  if (!navigator.onLine) return;

  // 2. 获取本地和远程数据
  const localData = await getLocalData();
  const remoteData = await getRemoteData();

  // 3. 比较数据版本
  const conflicts = detectConflicts(localData, remoteData);

  // 4. 解决冲突
  if (conflicts.length > 0) {
    await resolveConflicts(conflicts);
  }

  // 5. 同步数据
  await performSync();

  // 6. 更新同步状态
  updateSyncStatus(SYNC_STATUS.IDLE);
}
```

#### UUID 同步实现
使用 UUID 后，同步逻辑大大简化：

```javascript
// 同步本地数据到远程
export async function syncLocalToRemote(userId) {
  const unsyncedTasks = await getUnsyncedTasks();
  
  for (const task of unsyncedTasks) {
    // 直接 upsert，使用相同的 UUID
    // 包括 deleted=2 的墓碑数据也一起同步
    await supabase.from('tasks').upsert({
      id: task.id,              // 相同的 UUID，无需转换！
      user_id: userId,
      ...task
    });
  }
}

// 同步远程数据到本地
export async function syncRemoteToLocal(userId, lastSyncTime) {
  const { data: remoteTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSyncTime);
  
  for (const remoteTask of remoteTasks) {
    // ID 完全一致，直接更新
    // 包括 deleted=2 的墓碑数据也直接 upsert
    await updateLocalTask(remoteTask.id, remoteTask);
  }
}

// UI 过滤规则
export function filterTasksForDisplay(tasks, view) {
  const DELETE_STATUS = {
    NORMAL: 0,
    TRASH: 1,
    TOMBSTONE: 2
  };
  
  switch (view) {
    case 'normal':
      // 正常列表：只显示 deleted === 0 的任务
      return tasks.filter(task => task.deleted === DELETE_STATUS.NORMAL);
    case 'trash':
      // 收纳箱：只显示 deleted === 1 的任务
      return tasks.filter(task => task.deleted === DELETE_STATUS.TRASH);
    default:
      // 默认不显示 deleted === 2 的墓碑数据
      return tasks.filter(task => task.deleted !== DELETE_STATUS.TOMBSTONE);
  }
}

// TaskLists 过滤规则
export function filterTaskListsForDisplay(taskLists) {
  const DELETE_STATUS = {
    NORMAL: 0,
    TOMBSTONE: 2  // TaskLists 只有正常和墓碑两种状态
  };
  
  // 只显示未删除的任务列表
  return taskLists.filter(list => list.deleted !== DELETE_STATUS.TOMBSTONE);
}

// 本地创建任务示例
const newTask = {
  id: generateId(), // "550e8400-e29b-41d4-a716-446655440000"
  text: "新任务",
  // ... 其他字段
};

// 同步到云端时，直接使用相同的ID
await supabase.from('tasks').insert({
  id: newTask.id,   // 相同的 UUID，无需转换！
  user_id: userId,
  ...convertToSupabaseFormat(newTask)
});
```

### 3.6 同步进度弹窗设计

#### 组件位置
`src/components/SyncProgressModal.jsx`

#### 功能设计
通过用户下拉菜单中的“同步进度”按钮触发，展示所有同步状态和历史记录。

#### 界面设计
```javascript
const SyncProgressModal = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen) {
      loadSyncStatus();
    }
  }, [isOpen]);
  
  const loadSyncStatus = async () => {
    const status = await simpleSyncQueue.getSyncStatus();
    setSyncStatus(status);
    setLoading(false);
  };
  
  const handleRetry = async (itemId) => {
    await simpleSyncQueue.retryFailedItem(itemId);
    await loadSyncStatus(); // 刷新状态
  };
  
  const handleDelete = async (itemId) => {
    await simpleSyncQueue.deleteQueueItem(itemId);
    await loadSyncStatus(); // 刷新状态
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="sync-progress-modal">
        <h2>同步进度</h2>
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* 处理中的同步 */}
            {syncStatus.processing.length > 0 && (
              <section>
                <h3>正在同步 ({syncStatus.processing.length})</h3>
                {syncStatus.processing.map(item => (
                  <div key={item.id} className="sync-item processing">
                    <span>{item.action} - {item.entityType} - 处理中...</span>
                    <div className="sync-spinner" />
                  </div>
                ))}
              </section>
            )}
            
            {/* 等待同步的项 */}
            {syncStatus.pending.length > 0 && (
              <section>
                <h3>等待同步 ({syncStatus.pending.length})</h3>
                {syncStatus.pending.map(item => (
                  <div key={item.id} className="sync-item pending">
                    <span>{item.action} - {item.entityType}</span>
                    <span className="sync-time">{formatTime(item.createdAt)}</span>
                  </div>
                ))}
              </section>
            )}
            
            {/* 失败的同步 */}
            {syncStatus.failed.length > 0 && (
              <section>
                <h3 className="error">同步失败 ({syncStatus.failed.length})</h3>
                {syncStatus.failed.map(item => (
                  <div key={item.id} className="sync-item failed">
                    <div className="sync-info">
                      <span>{item.action} - {item.entityType}</span>
                      <span className="error-msg">{item.error}</span>
                      <span className="retry-count">重试次数: {item.retryCount}</span>
                    </div>
                    <div className="sync-actions">
                      <button 
                        onClick={() => handleRetry(item.id)}
                        className="btn-retry"
                      >
                        重试
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="btn-delete"
                        title="放弃该同步"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="batch-actions">
                  <button 
                    onClick={() => retryAllFailed()}
                    className="btn-retry-all"
                  >
                    重试全部
                  </button>
                  <button 
                    onClick={() => clearAllFailed()}
                    className="btn-clear-all"
                  >
                    清空失败记录
                  </button>
                </div>
              </section>
            )}
            
            {/* 已完成的同步 */}
            {syncStatus.completed.length > 0 && (
              <section>
                <h3>已同步 ({syncStatus.completed.length})</h3>
                <div className="completed-list">
                  {syncStatus.completed.slice(0, 10).map(item => (
                    <div key={item.id} className="sync-item completed">
                      <span>{item.action} - {item.entityType}</span>
                      <span className="sync-time">{formatTime(item.completedAt)}</span>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="btn-delete-small"
                        title="从列表中移除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {syncStatus.completed.length > 10 && (
                    <div className="more-items">
                      还有 {syncStatus.completed.length - 10} 项...
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => clearAllCompleted()}
                  className="btn-clear-completed"
                >
                  清空已完成记录
                </button>
              </section>
            )}
            
            {/* 无数据状态 */}
            {Object.values(syncStatus).every(arr => arr.length === 0) && (
              <div className="empty-state">
                <p>暂无同步记录</p>
              </div>
            )}
          </>
        )}
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn-close">
            关闭
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

#### 用户交互特性
1. **实时状态**: 显示当前正在处理的同步项
2. **手动重试**: 用户可以手动重试失败的同步项
3. **批量操作**: 一键重试所有失败项或清空记录
4. **历史记录**: 显示最近的同步成功记录
5. **手动清理**: 用户可以删除不需要的记录

#### 用户界面集成

1. **用户下拉菜单增加项**:
```javascript
// 在 Header.jsx 中添加
<MenuItem onClick={openSyncProgress}>
  <Icon name="sync" />
  同步进度
  {failedCount > 0 && (
    <Badge variant="error">{failedCount}</Badge>
  )}
</MenuItem>
```

2. **同步状态显示**:
```javascript
// 在页面底部添加状态条
const SyncStatusBar = () => {
  const { pending, processing, failed } = useSyncStatus();
  
  if (processing.length > 0) {
    return (
      <div className="sync-status-bar syncing">
        <Spinner size="small" />
        同步中... ({processing.length})
      </div>
    );
  }
  
  if (failed.length > 0) {
    return (
      <div className="sync-status-bar error">
        <Icon name="error" />
        {failed.length} 项同步失败
      </div>
    );
  }
  
  return null;
};
```

## 4. Hook 层改造

### 4.1 useTasks Hook 改造

#### 主要变更
```javascript
// 原有导入
import { getAllTasks, addTask, updateTask, ... } from '@/lib/indexeddb';

// 新的导入
import { useSyncQueue } from '@/lib/simple-sync-queue';
import { useAuthStore } from '@/stores/authStore';

export function useTasks(listId = 'today') {
  const authStore = useAuthStore();
  const syncQueue = useSyncQueue();
  
  // 初始化同步队列（只在首次渲染时执行）
  useEffect(() => {
    syncQueue.initialize(authStore);
  }, []);
  
  // 其他逻辑保持不变，但调用 syncQueue 的方法
  const handleAddTask = useCallback(async (quadrant, text = '') => {
    const newTask = await syncQueue.addTask({
      text,
      quadrant,
      listId,
      order: existingTasks.length
    }, authStore);
    // ... 更新本地状态
  }, [syncQueue, listId, authStore]);
}
```

### 4.2 useTaskLists Hook 改造

#### 主要变更
```javascript
export function useTaskLists() {
  const authStore = useAuthStore();
  const syncQueue = useSyncQueue();
  
  // 初始化（与useTasks共享同一个store实例）
  useEffect(() => {
    syncQueue.initialize(authStore);
  }, []);
  
  // 加载任务列表
  const loadTaskLists = useCallback(async () => {
    const lists = await syncQueue.getTaskLists();
    setTaskLists(lists);
  }, [syncQueue]);
  
  // 其他方法类似改造...
}
```

## 5. 数据迁移实现

### 5.1 迁移触发时机
- 用户首次登录成功后
- 检测到本地有数据但云端为空时
- 用户主动触发同步时

### 5.2 迁移流程
```javascript
async function migrateLocalDataToRemote(userId) {
  try {
    // 1. 检查是否已经迁移过
    const migrationKey = `migration_completed_${userId}`;
    if (localStorage.getItem(migrationKey) === 'true') {
      return { success: true, message: '数据已经迁移过' };
    }

    // 2. 检查云端是否已有数据
    const hasRemoteData = await getUserDataExists(userId);
    if (hasRemoteData) {
      localStorage.setItem(migrationKey, 'true');
      return { success: true, message: '云端已有数据，跳过迁移' };
    }

    // 3. 获取本地所有数据
    const localTaskLists = await getAllTaskLists();
    const localTasks = await getAllTasks();

    if (localTaskLists.length === 0 && localTasks.length === 0) {
      // 本地无数据，直接标记迁移完成
      localStorage.setItem(migrationKey, 'true');
      return { success: true, message: '本地无数据，无需迁移' };
    }

    // 4. 转换数据格式，添加用户ID
    const supabaseTaskLists = localTaskLists.map(list => 
      convertIndexedDBToSupabase(list, userId)
    );
    const supabaseTasks = localTasks.map(task => 
      convertIndexedDBToSupabase(task, userId)
    );

    // 5. 批量插入到 Supabase
    await batchInsertTaskLists(supabaseTaskLists, userId);
    await batchInsertTasks(supabaseTasks, userId);

    // 6. 标记迁移完成
    localStorage.setItem(migrationKey, 'true');
    
    return { success: true, message: '数据迁移完成' };
  } catch (error) {
    console.error('数据迁移失败:', error);
    return { success: false, error: error.message };
  }
}
```

## 6. 错误处理和容错机制

### 6.1 网络异常处理
```javascript
// SimpleSyncQueue 已经内置了网络异常处理
// 1. 所有操作首先写入本地，确保离线可用
// 2. 网络异常时，操作自动进入同步队列
// 3. 网络恢复后，自动处理队列中的操作

// 示例：网络状态监听
window.addEventListener('online', () => {
  console.log('网络已恢复，开始处理同步队列...');
  syncQueue.processQueue();
});

window.addEventListener('offline', () => {
  console.log('网络已断开，切换到离线模式');
  // SimpleSyncQueue 会自动处理，无需额外操作
});
```

### 6.2 数据冲突处理
```javascript
function detectConflicts(localData, remoteData) {
  const conflicts = [];
  
  localData.forEach(localItem => {
    const remoteItem = remoteData.find(r => r.id === localItem.id);
    if (remoteItem) {
      // 比较更新时间
      if (localItem.updatedAt !== remoteItem.updated_at) {
        conflicts.push({
          type: 'UPDATE_CONFLICT',
          local: localItem,
          remote: remoteItem
        });
      }
    }
  });
  
  return conflicts;
}
```

## 7. 状态管理增强

### 7.1 同步状态管理
```javascript
// 新增 syncStore
export const useSyncStore = create((set, get) => ({
  syncStatus: SYNC_STATUS.IDLE,
  lastSyncTime: null,
  pendingOperations: [],
  conflicts: [],
  
  setSyncStatus: (status) => set({ syncStatus: status }),
  addPendingOperation: (operation) => set(state => ({
    pendingOperations: [...state.pendingOperations, operation]
  })),
  // ... 其他同步相关状态管理
}));
```

### 7.2 认证状态监听
```javascript
// 在 SimpleSyncQueue 的 Zustand store 中监听认证状态变化
// 这段代码已经在上面的 SimpleSyncQueue 实现中包含了
// 监听登录状态变化通过 initialize 方法设置：

// initialize: (authStore) => {
//   authStore.subscribe((state, prevState) => {
//     if (state.user && !prevState.user) {
//       get().onUserLogin(state.user);
//     }
//   });
// }

// onUserLogin 方法处理用户登录：
// - 检查是否需要数据迁移
// - 处理积压的同步队列

// 用户登出由 authStore 自动处理，同步队列会检查认证状态
```

## 8. 性能优化策略

### 8.1 缓存策略
- **本地缓存**: IndexedDB 作为一级缓存
- **内存缓存**: Hook 状态作为二级缓存
- **智能更新**: 只同步变更的数据

### 8.2 批量操作
```javascript
// 批量操作优化
async function batchUpdate(operations) {
  // 合并同类操作
  const grouped = groupOperationsByType(operations);
  
  // 批量执行
  for (const [type, ops] of Object.entries(grouped)) {
    await executeBatchOperation(type, ops);
  }
}
```

### 8.3 懒加载
- 只在需要时初始化 Supabase 连接
- 按需加载远程数据
- 分页加载大量数据

## 9. 测试策略

### 9.1 单元测试
- SimpleSyncQueue 核心逻辑测试
- 数据转换函数测试
- 同步机制测试

### 9.2 集成测试
- 登录/登出流程测试
- 网络异常场景测试
- 数据一致性验证

### 9.3 E2E 测试
- 完整用户流程测试
- 多设备同步测试
- 离线使用场景测试

## 10. 部署和监控

### 10.1 环境变量
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 同步配置
SYNC_INTERVAL_MS=300000  # 5分钟
RETRY_MAX_ATTEMPTS=3
BATCH_SIZE=50
```

### 10.2 监控指标
- 同步成功率
- 网络错误频率
- 数据冲突次数
- 用户操作延迟

## 11. 实施时间表

### 阶段1: 基础架构 (1-2周)
- 创建 StorageManager 和 Supabase 数据层
- 实现基本的双写逻辑
- 基础测试覆盖

### 阶段2: 同步机制 (1-2周)
- 实现数据同步逻辑
- 冲突检测和解决
- 离线队列处理

### 阶段3: Hook 集成 (1周)
- 改造现有 Hook
- 保持接口兼容性
- 集成测试

### 阶段4: 优化和测试 (1周)
- 性能优化
- 全面测试
- 文档完善

总计：4-6周开发周期

## 12. 用户数据隔离和安全

### 12.1 数据隔离策略
- **Supabase RLS**: 使用行级安全策略确保用户只能访问自己的数据
- **UUID 统一ID**: 本地和云端使用相同的 UUID，无需转换
- **认证验证**: 所有操作都验证用户认证状态
- **数据迁移**: 本地数据迁移到云端时自动添加用户ID

### 12.2 关键安全点
```javascript
// 1. SimpleSyncQueue 自动处理用户ID
// 在 SimpleSyncQueue 中，所有操作都会根据认证状态自动处理

// 未登录用户：
// - 所有操作仅写入 IndexedDB
// - 不会创建同步队列项
// - 体验与之前完全一致

// 已登录用户：
// - 操作先写入 IndexedDB（保证即时响应）
// - 自动加入同步队列
// - 后台同步时自动添加 user_id

// 示例：任务添加时的用户ID处理
// 在 SimpleSyncQueue 的 processSyncItem 方法中
// 获取当前用户ID并添加到数据中
processSyncItem: async (item) => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  if (!userId) return; // 未登录不处理
  
  // 同步到 Supabase 时自动添加 user_id
  const dataWithUserId = {
    ...item.changes,
    user_id: userId
  };
  
  await syncManager.syncTask(item.action, item.entityId, dataWithUserId);
}

// 2. Supabase 操作自动添加用户过滤
export async function getSupabaseTasks(listId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user.id)
    .eq('list_id', listId)
    .eq('deleted', false)
    .order('quadrant')
    .order('order');
    
  if (error) throw error;
  return data;
}
```

### 12.3 UUID 统一机制
```javascript
// 使用 UUID 后，本地和云端使用完全相同的 ID
// 无需任何转换，大大简化了同步逻辑

// ID 生成使用浏览器原生 API
function generateId() {
  return crypto.randomUUID();
}
```

## 13. 未来版本改进计划

以下功能将在MVP版本稳定运行后，根据用户反馈在后续版本中考虑实现：

### V2.0 计划功能
1. **冲突解决增强**
   - 实现字段级别的三路合并
   - 或采用CRDT数据结构避免冲突

2. **同步性能优化**
   - 批量同步：收集多个操作后批量发送
   - 智能去重：相同实体的多次更新合并为一次
   - 请求节流：避免频繁的网络请求

3. **数据管理策略**
   - 自动清理30天前的墓碑数据
   - 归档旧的同步记录
   - 限制同步队列大小

4. **错误处理增强**
   - 区分不同错误类型的重试策略
   - 更智能的错误恢复机制
   - 减少对用户手动干预的依赖

### V3.0 远期规划
1. **协作功能**
   - 多用户共享任务列表
   - 实时协作编辑

2. **高级同步**
   - 增量同步优化
   - 压缩传输数据
   - 支持离线时间过长的数据合并

## 14. 四大原则的完整实现总结

### 原则实现对照表

| 核心原则 | 架构体现 | 关键实现 | 用户受益 |
|---------|---------|---------|---------|
| **离线可用** | 本地优先读写 | 所有操作先落 IndexedDB | 断网时应用完全可用 |
| **云端持久化** | 增量同步机制 | 只同步变更数据，后台执行 | 多设备数据一致，节省流量 |
| **冲突最小化** | 时间戳+智能合并 | 自动解决99%冲突 | 无需手动处理冲突 |
| **统一接口** | Provider模式 | 本地/远程同一接口 | 易测试、易扩展、易维护 |

### 用户体验优势

#### 1. **即时响应** (离线可用)
```
用户操作 → 本地立即更新 → UI立即响应 → 后台同步云端
    ↓
0延迟的用户体验
```

#### 2. **无感知同步** (云端持久化)
```
本地变更 → 记录时间戳 → 后台增量推送 → 云端持久化
    ↓
用户无感知的数据备份
```

#### 3. **智能合并** (冲突最小化)
```
多设备编辑 → 时间戳比较 → 字段级合并 → 透明解决冲突
    ↓
无需用户干预的数据一致性
```

#### 4. **可靠稳定** (统一接口)
```
接口标准化 → 独立测试 → 模块化设计 → 易于维护扩展
    ↓
高质量的软件架构
```

### 技术保障

- **数据安全**: 用户数据完全隔离，RLS策略防护
- **平滑迁移**: 本地数据无缝迁移到云端
- **向下兼容**: 未登录用户体验完全不变
- **跨设备同步**: 登录用户数据实时同步
- **离线工作**: 网络异常时完全依赖本地存储
- **自动恢复**: 网络恢复后自动处理同步队列

这个设计确保了应用在各种网络环境下都能提供最佳的用户体验，同时保持代码的可维护性和可扩展性。