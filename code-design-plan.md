# iTodo 混合存储代码设计方案

## 1. 核心设计原则

### 四大核心原则

#### 1. **离线可用**：所有读写首先落本地 IndexedDB
- **本地优先**: 所有操作首先在本地 IndexedDB 中完成，确保即时响应
- **离线工作**: 无网络时应用完全可用，用户无感知
- **数据持久化**: 本地数据永远不丢失，作为最可靠的数据源
- **快速响应**: UI 更新基于本地数据，不等待网络请求

#### 2. **云端持久化**：同一份数据增量同步到 Supabase Postgres
- **增量同步**: 只同步变更的数据，减少网络传输和处理开销
- **双向同步**: 本地→云端，云端→本地，确保多设备数据一致
- **后台同步**: 同步过程不阻塞用户操作，静默进行
- **数据备份**: 云端作为数据备份和跨设备共享的载体

#### 3. **冲突最小化**：离线重连后自动合并，无须用户手动解决
- **时间戳机制**: 基于最后修改时间自动解决大部分冲突
- **智能合并**: 非冲突字段自动合并，只有真正冲突才需处理
- **最后写入获胜**: 对于简单冲突，采用最后修改时间优先原则
- **透明处理**: 冲突解决对用户透明，保持流畅体验

#### 4. **可测试 & 可扩展**：本地/远程两套实现遵守同一接口
- **统一接口**: 本地和远程存储实现相同的 API 签名
- **依赖注入**: 通过配置切换存储实现，便于测试和扩展
- **模块化设计**: 存储层独立，可以轻松替换或扩展
- **单元测试**: 每个存储实现都可以独立测试

### 架构目标
- **未登录用户**: 保持现有体验，仅使用 IndexedDB 本地存储
- **已登录用户**: IndexedDB + Supabase 双重存储，本地优先
- **数据同步**: 登录时将本地数据同步到云端
- **无缝切换**: 登录/登出过程中用户体验平滑

## 2. 架构设计

### 2.1 整体架构图
```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Components)                    │
├─────────────────────────────────────────────────────────┤
│                    Hook 层 (useTasks, useTaskLists)      │
├─────────────────────────────────────────────────────────┤
│                   存储管理层 (StorageManager)              │
├───────────────────────┬─────────────────────────────────┤
│   IndexedDB 层         │        Supabase 层              │
│   (本地存储)           │        (云端存储)                │
└───────────────────────┴─────────────────────────────────┘
```

### 2.2 本地优先存储策略

| 用户状态 | 操作类型 | IndexedDB | Supabase | 执行顺序 | 说明 |
|---------|---------|-----------|----------|---------|------|
| 未登录 | 读取 | ✅ | ❌ | 1. 本地读取 | 仅从本地读取 |
| 未登录 | 写入 | ✅ | ❌ | 1. 本地写入 | 仅写入本地 |
| 已登录 | 读取 | ✅ 优先 | ✅ 后台 | 1. 本地读取<br>2. 后台同步 | **本地优先**，后台从云端拉取更新 |
| 已登录 | 写入 | ✅ 先执行 | ✅ 后执行 | 1. 本地写入<br>2. 云端同步 | **本地先写**，立即响应UI，后台同步云端 |
| 网络异常 | 读取 | ✅ | ❌ | 1. 本地读取 | 完全依赖本地数据 |
| 网络异常 | 写入 | ✅ | ❌ | 1. 本地写入<br>2. 加入同步队列 | 本地写入，网络恢复后同步 |

### 2.3 核心原则体现

#### 离线可用 (Offline-First)
```javascript
// 所有操作都优先使用本地存储
async function addTask(taskData) {
  // 1. 立即写入本地 (保证离线可用)
  const localTask = await addTaskToIndexedDB(taskData);
  
  // 2. 立即返回结果 (快速响应)
  updateUI(localTask);
  
  // 3. 后台同步到云端 (不阻塞用户)
  if (isOnline && isAuthenticated) {
    syncToSupabase(localTask).catch(err => {
      // 同步失败时加入重试队列
      addToSyncQueue(localTask);
    });
  }
  
  return localTask;
}
```

#### 云端持久化 (Incremental Sync)
```javascript
// 增量同步机制
class SyncManager {
  async performIncrementalSync() {
    // 1. 获取本地最后同步时间戳
    const lastSyncTime = await getLastSyncTimestamp();
    
    // 2. 查找本地变更数据 (自上次同步后)
    const localChanges = await getLocalChanges(lastSyncTime);
    
    // 3. 推送本地变更到云端
    for (const change of localChanges) {
      await pushChangeToSupabase(change);
    }
    
    // 4. 拉取云端变更 (自上次同步后)
    const remoteChanges = await pullRemoteChanges(lastSyncTime);
    
    // 5. 应用云端变更到本地
    for (const change of remoteChanges) {
      await applyRemoteChangeLocally(change);
    }
    
    // 6. 更新同步时间戳
    await updateLastSyncTimestamp(Date.now());
  }
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

#### 统一接口 (Testable & Scalable)
```javascript
// 统一的存储接口
interface IStorageProvider {
  async getTasks(listId: string): Promise<Task[]>;
  async addTask(task: Task): Promise<Task>;
  async updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  async deleteTask(id: string): Promise<void>;
}

// IndexedDB 实现
class IndexedDBProvider implements IStorageProvider {
  async getTasks(listId: string) {
    return await getAllTasks(listId);
  }
  // ... 其他方法实现
}

// Supabase 实现
class SupabaseProvider implements IStorageProvider {
  async getTasks(listId: string) {
    return await getSupabaseTasks(listId);
  }
  // ... 其他方法实现
}

// 存储管理器使用统一接口
class StorageManager {
  constructor(
    private localProvider: IStorageProvider,
    private remoteProvider: IStorageProvider
  ) {}
  
  async addTask(taskData) {
    // 本地优先
    const result = await this.localProvider.addTask(taskData);
    
    // 后台同步
    if (this.shouldSync()) {
      this.remoteProvider.addTask(taskData).catch(this.handleSyncError);
    }
    
    return result;
  }
}
```

## 3. 核心模块设计

### 3.1 存储管理器 (StorageManager)

#### 文件位置
`src/lib/storage-manager.js`

#### 核心职责
- 根据登录状态选择存储策略
- 实现双写逻辑
- 处理数据同步
- 管理离线队列

#### 基于四大原则的接口设计
```javascript
class StorageManager {
  constructor(authStore, localProvider, remoteProvider) {
    this.authStore = authStore;           // 认证状态管理
    this.localProvider = localProvider;   // 本地存储提供者 (IndexedDB)
    this.remoteProvider = remoteProvider; // 远程存储提供者 (Supabase)
    this.syncManager = new SyncManager(); // 同步管理器
    this.conflictResolver = new ConflictResolver(); // 冲突解决器
    this.syncQueue = [];                  // 离线操作队列
    this.isOnline = true;                 // 网络状态
    this.currentUserId = null;            // 当前用户ID
  }

  // 初始化
  async initialize()

  // 【原则1: 离线可用】所有操作本地优先
  async getTasks(listId, options = {}) {
    // 立即从本地读取
    const localTasks = await this.localProvider.getTasks(listId);
    
    // 后台同步 (不阻塞返回)
    this._backgroundSync(() => this._syncTasks(listId));
    
    return localTasks;
  }

  async addTask(taskData) {
    // 1. 立即写入本地 (离线可用)
    const localTask = await this.localProvider.addTask(taskData);
    
    // 2. 后台同步到云端 (增量同步)
    this._backgroundSync(() => this._syncNewTask(localTask));
    
    return localTask; // 立即返回
  }

  async updateTask(id, updates) {
    // 1. 立即更新本地
    const updatedTask = await this.localProvider.updateTask(id, updates);
    
    // 2. 记录变更用于增量同步
    await this._recordChange('UPDATE', updatedTask);
    
    // 3. 后台同步
    this._backgroundSync(() => this._syncTaskUpdate(updatedTask));
    
    return updatedTask;
  }

  async deleteTask(id) {
    // 本地优先删除
    await this.localProvider.deleteTask(id);
    
    // 后台同步删除
    this._backgroundSync(() => this._syncTaskDeletion(id));
  }

  // 【原则2: 云端持久化】增量同步
  async performIncrementalSync() {
    return await this.syncManager.performIncrementalSync(
      this.localProvider,
      this.remoteProvider,
      this.currentUserId
    );
  }

  // 【原则3: 冲突最小化】自动合并
  async resolveConflicts(conflicts) {
    const resolved = [];
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(
        conflict.local,
        conflict.remote
      );
      resolved.push(resolution);
    }
    return resolved;
  }

  // 【原则4: 统一接口】可测试性
  async _executeOperation(operation, fallback = null) {
    try {
      // 尝试执行操作
      return await operation();
    } catch (error) {
      if (fallback) {
        console.warn('Operation failed, using fallback:', error);
        return await fallback();
      }
      throw error;
    }
  }

  // 后台同步 (不阻塞用户操作)
  _backgroundSync(syncOperation) {
    if (this.isOnline && this.authStore.isAuthenticated()) {
      // 异步执行，不等待结果
      syncOperation().catch(error => {
        console.warn('Background sync failed:', error);
        // 失败的操作加入重试队列
        this.syncQueue.push(syncOperation);
      });
    }
  }

  // 网络恢复时处理同步队列
  async processSyncQueue() {
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift();
      try {
        await operation();
      } catch (error) {
        console.error('Sync queue operation failed:', error);
        // 重新加入队列等待下次处理
        this.syncQueue.push(operation);
        break;
      }
    }
  }

  // 内部方法
  _getCurrentUserId() {
    return this.authStore.user?.id || null;
  }

  _shouldSync() {
    return this.isOnline && this.authStore.isAuthenticated();
  }

  async _recordChange(type, data) {
    // 记录本地变更，用于增量同步
    const change = {
      type,
      data,
      timestamp: Date.now(),
      userId: this._getCurrentUserId()
    };
    
    await this.localProvider.recordChange(change);
  }
}
```

### 3.2 Supabase 数据层

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
export async function deleteSupabaseTask(id)
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
export async function initializeUserData(userId) // 新用户初始化
export async function getUserDataExists(userId)  // 检查用户数据是否存在

// 工具函数 (处理用户ID转换)
export function convertIndexedDBToSupabase(data, userId)
export function convertSupabaseToIndexedDB(data)
export function generateUserSpecificId(localId, userId)
export function extractLocalId(supabaseId, userId)

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

### 3.3 时区统一处理

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
class TimeUtils {
  // 创建UTC时间戳
  static nowUTC() {
    return new Date(); // JavaScript Date 内部就是 UTC
  }
  
  // 标准化时间戳为UTC毫秒数
  static toUTCMillis(timestamp) {
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
    }
    return timestamp;
  }
  
  // 安全的时间戳比较
  static compare(timestamp1, timestamp2) {
    const t1 = this.toUTCMillis(timestamp1);
    const t2 = this.toUTCMillis(timestamp2);
    return t1 - t2; // > 0 表示 t1 更新
  }
}

// 在数据操作中使用
function updateTaskWithTimestamp(taskData) {
  return {
    ...taskData,
    updatedAt: TimeUtils.nowUTC() // 确保使用 UTC
  };
}
```

### 3.4 同步机制设计

#### 同步时机
1. **用户登录时**: 自动同步本地数据到云端
2. **定期同步**: 每5分钟检查一次数据差异
3. **操作失败时**: 网络恢复后自动重试
4. **应用启动时**: 如果已登录，检查数据一致性

#### 同步策略
```javascript
// 同步状态枚举
const SYNC_STATUS = {
  IDLE: 'idle',           // 空闲状态
  SYNCING: 'syncing',     // 同步中
  CONFLICT: 'conflict',   // 数据冲突
  ERROR: 'error'          // 同步错误
};

// 冲突解决策略
const CONFLICT_RESOLUTION = {
  LOCAL_WINS: 'local',      // 本地数据优先
  REMOTE_WINS: 'remote',    // 远程数据优先
  MERGE: 'merge',           // 智能合并
  ASK_USER: 'ask'           // 询问用户
};
```

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

## 4. Hook 层改造

### 4.1 useTasks Hook 改造

#### 主要变更
```javascript
// 原有导入
import { getAllTasks, addTask, updateTask, ... } from '@/lib/indexeddb';

// 新的导入
import { StorageManager } from '@/lib/storage-manager';
import { useAuthStore } from '@/stores/authStore';

export function useTasks(listId = 'today') {
  const authStore = useAuthStore();
  const [storageManager] = useState(() => new StorageManager(authStore));
  
  // 其他逻辑保持不变，但调用 storageManager 的方法
  const handleAddTask = useCallback(async (quadrant, text = '') => {
    const newTask = await storageManager.addTask({
      text,
      quadrant,
      listId,
      order: existingTasks.length
    });
    // ... 更新本地状态
  }, [storageManager, listId]);
}
```

### 4.2 useTaskLists Hook 改造

#### 主要变更
```javascript
export function useTaskLists() {
  const authStore = useAuthStore();
  const [storageManager] = useState(() => new StorageManager(authStore));
  
  // 加载任务列表
  const loadTaskLists = useCallback(async () => {
    const lists = await storageManager.getTaskLists();
    setTaskLists(lists);
  }, [storageManager]);
  
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
      // 本地无数据，初始化默认数据
      await initializeUserData(userId);
      localStorage.setItem(migrationKey, 'true');
      return { success: true, message: '初始化默认数据完成' };
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
class StorageManager {
  async _executeWithFallback(operation) {
    try {
      if (this._shouldUseRemote()) {
        // 尝试远程操作
        const result = await operation.remote();
        // 同时更新本地缓存
        await operation.local();
        return result;
      } else {
        // 直接执行本地操作
        return await operation.local();
      }
    } catch (error) {
      if (this._isNetworkError(error)) {
        // 网络错误，降级到本地
        console.warn('网络异常，降级到本地存储:', error);
        return await operation.local();
      }
      throw error;
    }
  }
}
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
// 在 StorageManager 中监听认证状态变化
constructor(authStore) {
  this.authStore = authStore;
  
  // 监听登录状态变化
  this.authStore.subscribe((state, prevState) => {
    if (state.user && !prevState.user) {
      // 用户刚登录，触发同步
      this.syncLocalToRemote();
    } else if (!state.user && prevState.user) {
      // 用户登出，清理远程相关状态
      this.cleanup();
    }
  });
}
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
- StorageManager 核心逻辑测试
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
- **ID命名空间**: 本地ID转换为 `${userId}_${localId}` 格式
- **认证验证**: 所有操作都验证用户认证状态
- **数据迁移**: 本地数据迁移到云端时自动添加用户ID

### 12.2 关键安全点
```javascript
// 1. StorageManager 自动处理用户ID
class StorageManager {
  _getCurrentUserId() {
    return this.authStore.user?.id || null;
  }

  async addTask(taskData) {
    const userId = this._getCurrentUserId();
    if (!userId) {
      // 未登录，仅使用本地存储
      return await addTaskToIndexedDB(taskData);
    }
    
    // 已登录，双写模式
    const localResult = await addTaskToIndexedDB(taskData);
    const remoteResult = await addSupabaseTask({
      ...taskData,
      user_id: userId,
      id: this._generateUserSpecificId(taskData.id, userId)
    });
    
    return localResult;
  }
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

### 12.3 ID转换机制
```javascript
// 确保不同用户的本地ID不会冲突
function generateUserSpecificId(localId, userId) {
  return `${userId}_${localId}`;
}

function extractLocalId(supabaseId, userId) {
  const prefix = `${userId}_`;
  return supabaseId.startsWith(prefix) 
    ? supabaseId.slice(prefix.length)
    : supabaseId;
}
```

## 13. 四大原则的完整实现总结

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