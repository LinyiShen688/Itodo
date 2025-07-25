# iTodo 混合存储系统开发任务清单

> 基于四大核心原则：离线可用、云端持久化、冲突最小化、统一接口  
> **本地优先策略**：未登录用户仅用IndexedDB，已登录用户双重存储本地优先

## 📋 项目状态总览
- [x] **数据库表结构** - 已在Supabase创建完成
- [ ] **核心架构实现**
- [ ] **同步机制实现** 
- [ ] **数据迁移功能**
- [ ] **Hook层改造**
- [ ] **测试与优化**

---

## 🎯 阶段1: 核心架构实现

### 1.1 Supabase数据操作层
- [ ] 创建 `src/lib/supabase-db.js`
  - [ ] 实现任务CRUD操作函数
    - [ ] `getSupabaseTasks(listId)` - 获取任务
    - [ ] `addSupabaseTask(taskData)` - 添加任务
    - [ ] `updateSupabaseTask(id, updates)` - 更新任务
    - [ ] `deleteSupabaseTask(id)` - 删除任务
    - [ ] `moveSupabaseTask(taskId, fromQuadrant, toQuadrant, newOrder)` - 移动任务
    - [ ] `reorderSupabaseTasks(tasks)` - 重排任务
  - [ ] 实现任务列表CRUD操作函数
    - [ ] `getSupabaseTaskLists()` - 获取任务列表
    - [ ] `addSupabaseTaskList(name, options)` - 添加任务列表
    - [ ] `updateSupabaseTaskList(id, updates)` - 更新任务列表
    - [ ] `deleteSupabaseTaskList(id)` - 删除任务列表
    - [ ] `setSupabaseActiveTaskList(id)` - 设置激活列表
  - [ ] 实现数据格式转换工具
    - [ ] `convertIndexedDBToSupabase(data, userId)` - 本地→云端格式转换
    - [ ] `convertSupabaseToIndexedDB(data)` - 云端→本地格式转换
    - [ ] `generateUserSpecificId(localId, userId)` - 生成用户专用ID
    - [ ] `extractLocalId(supabaseId, userId)` - 提取本地ID
  - [ ] 实现用户数据管理
    - [ ] `initializeUserData(userId)` - 新用户初始化
    - [ ] `getUserDataExists(userId)` - 检查用户数据是否存在
  - [ ] 实现应用层数据验证
    - [ ] `validateTaskListOwnership(listId, userId)` - 验证任务列表归属
    - [ ] `validateTaskOwnership(taskId, userId)` - 验证任务归属

### 1.2 时间处理工具
- [ ] 创建 `src/lib/time-utils.js`
  - [ ] `nowUTC()` - 创建UTC时间戳
  - [ ] `toUTCMillis(timestamp)` - 标准化时间戳为UTC毫秒数
  - [ ] `compare(timestamp1, timestamp2)` - 安全的时间戳比较
  - [ ] `normalizeToUTC(timestamp)` - 时区统一工具函数

### 1.3 核心存储管理器
- [ ] 创建 `src/lib/storage-manager.js`
  - [ ] 实现StorageManager类基础结构
    - [ ] 构造函数和初始化
    - [ ] 用户状态检测方法
    - [ ] 网络状态监听
  - [ ] 实现**本地优先存储策略**
    - [ ] `getTasks(listId)` - 根据登录状态选择策略
      - [ ] 未登录：仅从IndexedDB读取
      - [ ] 已登录：IndexedDB优先，后台从Supabase同步
    - [ ] `addTask(taskData)` - 根据登录状态选择策略
      - [ ] 未登录：仅写入IndexedDB
      - [ ] 已登录：先写IndexedDB，后台同步Supabase
    - [ ] `updateTask(id, updates)` - 同上策略
    - [ ] `deleteTask(id)` - 同上策略
    - [ ] `moveTask(taskId, fromQuadrant, toQuadrant, newOrder)` - 同上策略
    - [ ] `reorderTasks(tasks)` - 同上策略
  - [ ] 实现任务列表操作
    - [ ] `getTaskLists()` - 根据登录状态选择策略
    - [ ] `addTaskList(name, options)` - 根据登录状态选择策略
    - [ ] `updateTaskList(id, updates)` - 根据登录状态选择策略
    - [ ] `deleteTaskList(id)` - 根据登录状态选择策略
    - [ ] `setActiveTaskList(id)` - 根据登录状态选择策略
  - [ ] 实现后台同步机制
    - [ ] `_backgroundSync(syncOperation)` - 不阻塞用户操作的后台同步
    - [ ] `_shouldSync()` - 判断是否需要同步（在线+已认证）
    - [ ] `_recordChange(type, data)` - 记录变更用于增量同步

---

## 🔄 阶段2: 同步机制实现

### 2.1 增量同步管理器
- [ ] 创建 `src/lib/sync-manager.js`
  - [ ] 实现SyncManager类
    - [ ] `performIncrementalSync()` - 执行增量同步
    - [ ] `getLastSyncTimestamp()` - 获取上次同步时间
    - [ ] `updateLastSyncTimestamp(timestamp)` - 更新同步时间
    - [ ] `getLocalChanges(since)` - 获取本地变更
    - [ ] `pullRemoteChanges(since)` - 拉取远程变更
    - [ ] `pushChangeToSupabase(change)` - 推送变更到云端
    - [ ] `applyRemoteChangeLocally(change)` - 应用远程变更到本地

### 2.2 冲突解决器
- [ ] 创建 `src/lib/conflict-resolver.js`
  - [ ] 实现ConflictResolver类
    - [ ] `resolve(localData, remoteData)` - 自动冲突解决
    - [ ] `detectConflicts(localData, remoteData)` - 冲突检测
    - [ ] `autoMergeFields(local, remote)` - 智能字段合并
    - [ ] `lastWriteWins(local, remote)` - UTC时间统一的LWW算法

### 2.3 离线队列管理
- [ ] 在StorageManager中实现离线队列
  - [ ] `addToSyncQueue(operation)` - 添加到同步队列
  - [ ] `processSyncQueue()` - 处理同步队列
  - [ ] `clearSyncQueue()` - 清空同步队列
  - [ ] 网络状态变化监听
  - [ ] 自动重试机制

---

## 📦 阶段3: 数据迁移功能

### 3.1 数据迁移工具
- [ ] 在StorageManager中实现迁移功能
  - [ ] `migrateLocalDataToRemote(userId)` - 本地数据迁移到云端
    - [ ] 检查是否已迁移过
    - [ ] 检查云端是否已有数据
    - [ ] 转换本地数据格式
    - [ ] 批量上传到Supabase
    - [ ] 标记迁移完成
  - [ ] 迁移进度监控
  - [ ] 迁移失败恢复机制

### 3.2 登录时触发迁移
- [ ] 修改 `src/stores/authStore.js`
  - [ ] 在登录成功后触发数据迁移
  - [ ] 集成迁移进度提示
  - [ ] 处理迁移失败场景

---

## 🔗 阶段4: Hook层改造

### 4.1 改造useTasks Hook
- [ ] 修改 `src/hooks/useTasks.js`
  - [ ] 引入StorageManager替换直接的IndexedDB调用
  - [ ] 保持完全的接口兼容性
  - [ ] 所有操作方法改为使用StorageManager
    - [ ] `loadTasks()` - 使用storageManager.getTasks()
    - [ ] `handleAddTask()` - 使用storageManager.addTask()
    - [ ] `handleUpdateTask()` - 使用storageManager.updateTask()
    - [ ] `handleDeleteTask()` - 使用storageManager.deleteTask()
    - [ ] `handleMoveTask()` - 使用storageManager.moveTask()
    - [ ] `handleReorderTasks()` - 使用storageManager.reorderTasks()
  - [ ] 添加同步状态暴露（可选）

### 4.2 改造useTaskLists Hook
- [ ] 修改 `src/hooks/useTaskLists.js`
  - [ ] 引入StorageManager替换直接的IndexedDB调用
  - [ ] 保持完全的接口兼容性
  - [ ] 所有操作方法改为使用StorageManager
    - [ ] `loadTaskLists()` - 使用storageManager.getTaskLists()
    - [ ] `handleAddTaskList()` - 使用storageManager.addTaskList()
    - [ ] `handleUpdateTaskList()` - 使用storageManager.updateTaskList()
    - [ ] `handleSetActiveList()` - 使用storageManager.setActiveTaskList()
    - [ ] `handleDeleteTaskList()` - 使用storageManager.deleteTaskList()

### 4.3 同步状态管理
- [ ] 创建 `src/stores/syncStore.js`
  - [ ] 同步状态管理
    - [ ] `syncStatus` - 同步状态枚举
    - [ ] `lastSyncTime` - 上次同步时间
    - [ ] `pendingOperations` - 待同步操作
    - [ ] `conflicts` - 冲突列表
  - [ ] 同步状态操作
    - [ ] `setSyncStatus(status)` - 设置同步状态
    - [ ] `addPendingOperation(operation)` - 添加待同步操作
    - [ ] `clearPendingOperations()` - 清空待同步操作

- [ ] 创建 `src/hooks/useSync.js` (可选)
  - [ ] 暴露同步状态给组件使用
  - [ ] 同步进度指示器支持
  - [ ] 冲突解决UI支持

---

## 🧪 阶段5: 测试与优化

### 5.1 功能测试
- [ ] 测试未登录用户体验
  - [ ] 确保完全使用IndexedDB
  - [ ] 确保体验与现在完全一致
  - [ ] 确保不会调用Supabase相关功能

- [ ] 测试已登录用户体验
  - [ ] 测试本地优先读写
  - [ ] 测试后台同步功能
  - [ ] 测试数据迁移功能

- [ ] 测试网络异常场景
  - [ ] 离线时完全依赖本地
  - [ ] 网络恢复后自动同步
  - [ ] 同步队列正常工作

### 5.2 集成测试
- [ ] 登录/登出流程测试
- [ ] 多设备同步测试
- [ ] 数据一致性验证
- [ ] 冲突解决测试

### 5.3 性能优化
- [ ] 批量操作优化
- [ ] 缓存策略调整
- [ ] 内存使用优化
- [ ] 网络请求优化

### 5.4 用户体验完善
- [ ] 加载状态优化
- [ ] 错误提示友好化
- [ ] 同步状态可视化（可选）
- [ ] 操作响应速度优化

---

## ⚠️ 重要注意事项

1. **保持向下兼容**：未登录用户体验必须与现在完全一致
2. **本地优先原则**：所有操作先写本地，立即响应UI，后台同步
3. **错误降级**：网络或云端异常时自动降级到本地存储
4. **数据安全**：所有云端操作都要验证用户权限
5. **时区统一**：所有时间戳使用UTC，避免冲突解决错误

---

## 📁 核心文件清单

```
src/lib/
├── storage-manager.js      # 🎯 核心存储管理器（根据登录状态选择策略）
├── supabase-db.js         # 🔗 Supabase数据操作层
├── sync-manager.js        # 🔄 增量同步管理器
├── conflict-resolver.js   # ⚔️ 冲突解决器
└── time-utils.js          # ⏰ UTC时间处理工具

src/stores/
├── authStore.js           # 🔐 认证状态管理（已存在，需小幅修改）
└── syncStore.js           # 📊 同步状态管理（新建）

src/hooks/
├── useTasks.js           # 📝 任务Hook（改造使用StorageManager）
├── useTaskLists.js       # 📋 任务列表Hook（改造使用StorageManager）
└── useSync.js            # 🔄 同步状态Hook（新建，可选）
```

---

**进度跟踪**：完成一项任务后，在对应的 `[ ]` 中打 `[x]` 标记完成状态。