# iTodo 混合存储实现任务清单

## 实现概览
本文档基于 `code-design-plan.md` 和 `database-schema.md`，将混合存储功能实现划分为可独立开发、测试的模块。每个模块完成后需要进行单元测试、lint、dev测试、构建。

## 模块划分与实现顺序

### 阶段 1: 基础设施搭建

#### 1.1 数据库版本升级与同步队列创建
- [x] 升级 IndexedDB 版本从 4 到 5
- [x] 创建 syncQueue 对象存储
- [x] 添加
必要的索引 (status, createdAt, entityType, action)
- [x] 验证数据库升级不影响现有数据
- **测试要点**: 数据库升级测试、现有数据完整性验证
- **文件**: `src/lib/indexeddb.js`

#### 1.2 时区处理工具函数
- [x] 实现 `normalizeToUTC()` 函数
- [x] 实现 `toUTCMillis()` 函数
- [x] 实现 `compareTimestamps()` 函数
- [x] 创建时区处理单元测试
- **测试要点**: 不同时区格式转换、时间戳比较准确性
- **文件**: `src/lib/time-utils.js`

#### 1.3 数据格式转换函数
- [x] 实现 `convertIndexedDBToSupabase()` 函数
- [x] 实现 `convertSupabaseToIndexedDB()` 函数
- [x] 处理所有字段的格式转换（驼峰/下划线、布尔值/数字等）
- [x] 创建数据转换单元测试
- **测试要点**: 双向转换的准确性、边界情况处理
- **文件**: `src/lib/data-converters.js`

### 阶段 2: 核心模块实现

#### 2.1 IndexedDBManager 模块
- [x] 创建 `src/lib/indexeddb-manager.js`
- [x] 导出现有 IndexedDB 函数
- [x] 添加 `getTask()` 和 `getTaskList()` 单项查询函数
- [x] 添加 `insertTask()` 和 `insertTaskList()` 直接插入函数
- **测试要点**: 所有 CRUD 操作的正确性
- **文件**: `src/lib/indexeddb-manager.js`

#### 2.2 QueueManager 模块
- [ ] 创建 `src/lib/queue-manager.js`
- [ ] 实现 `addToQueue()` 函数
- [ ] 实现 `getPendingItems()` 函数
- [ ] 实现 `updateItemStatus()` 函数
- [ ] 实现 `updateItem()` 函数
- [ ] 实现 `getSyncStatus()` 函数
- [ ] 实现 `deleteQueueItem()` 函数
- [ ] 创建队列管理单元测试
- **测试要点**: 队列状态转换、并发操作安全性
- **文件**: `src/lib/queue-manager.js`

#### 2.3 SyncManager 模块
- [ ] 创建 `src/lib/sync-manager.js`
- [ ] 实现 `syncTask()` 函数（处理 add/update/delete 操作）
- [ ] 实现 `isRetryableError()` 函数
- [ ] 实现网络监听和回调机制
- [ ] 实现模块级状态管理
- **测试要点**: 网络错误处理、重试逻辑
- **文件**: `src/lib/sync-manager.js`

### 阶段 3: Supabase 集成

#### 3.1 Supabase 数据层实现
- [ ] 创建 `src/lib/supabase-db.js`
- [ ] 实现所有任务 CRUD 操作函数
- [ ] 实现所有任务列表 CRUD 操作函数
- [ ] 实现数据验证函数 (`validateTaskListOwnership`, `validateTaskOwnership`)
- [ ] 实现批量操作函数
- [ ] 添加错误处理和重试机制
- **测试要点**: API 调用正确性、错误处理、数据验证
- **文件**: `src/lib/supabase-db.js`

#### 3.2 数据迁移模块
- [ ] 创建 `src/lib/data-migration.js`
- [ ] 实现 `checkMigrationNeeded()` 函数
- [ ] 实现 `migrateLocalDataToSupabase()` 函数
- [ ] 实现 `getUserDataExists()` 检查函数
- [ ] 创建迁移状态管理
- **测试要点**: 数据完整性、重复迁移防护
- **文件**: `src/lib/data-migration.js`

### 阶段 4: UnifiedStorage 统一层

#### 4.1 UnifiedStorage Store 实现
- [ ] 创建 `src/lib/unified-storage.js`
- [ ] 实现 Zustand store 基础结构
- [ ] 实现 `initialize()` 函数
- [ ] 实现所有任务操作方法 (getTasks, addTask, updateTask, deleteTask 等)
- [ ] 实现所有任务列表操作方法
- [ ] 实现 `processQueue()` 队列处理函数
- [ ] 实现 `processSyncItem()` 单项同步函数
- **测试要点**: 操作流程完整性、认证状态处理
- **文件**: `src/lib/unified-storage.js`

#### 4.2 同步流程实现
- [ ] 实现 `pullRemoteData()` 拉取远程数据
- [ ] 实现 `applyRemoteData()` 应用远程数据
- [ ] 实现 `applyRemoteChange()` 单项冲突处理
- [ ] 实现 `clearInvalidQueueItems()` 清理无效队列项
- [ ] 实现 `onUserLogin()` 登录同步流程
- **测试要点**: 冲突解决正确性、数据一致性
- **文件**: `src/lib/unified-storage.js` (继续)

### 阶段 5: UI 集成

#### 5.1 Hook 层改造
- [ ] 修改 `useTasks` hook 使用 UnifiedStorage
- [ ] 修改 `useTaskLists` hook 使用 UnifiedStorage
- [ ] 确保所有操作通过 UnifiedStorage
- [ ] 添加初始化逻辑
- **测试要点**: 功能保持不变、性能无退化
- **文件**: `src/hooks/useTasks.js`, `src/hooks/useTaskLists.js`

#### 5.2 同步进度弹窗组件
- [ ] 创建 `src/components/SyncProgressModal.jsx`
- [ ] 实现同步状态显示（处理中、等待、失败、完成）
- [ ] 实现用户操作（重试、删除、批量操作）
- [ ] 添加实时状态更新
- [ ] 集成到用户菜单
- **测试要点**: 状态显示准确性、用户交互流畅性
- **文件**: `src/components/SyncProgressModal.jsx`

#### 5.3 同步状态栏组件
- [ ] 创建 `src/components/SyncStatusBar.jsx`
- [ ] 显示当前同步状态
- [ ] 显示失败数量和提示
- [ ] 集成到主界面底部
- **测试要点**: 状态实时更新、视觉反馈
- **文件**: `src/components/SyncStatusBar.jsx`

### 阶段 6: 集成测试与优化

#### 6.1 端到端测试
- [ ] 测试完整的用户注册登录流程
- [ ] 测试数据迁移流程
- [ ] 测试离线操作和在线同步
- [ ] 测试多设备数据同步
- [ ] 测试冲突解决机制
- **测试要点**: 全流程正确性、边界情况处理

#### 6.2 性能优化
- [ ] 测试和优化同步队列处理性能
- [ ] 优化批量数据操作
- [ ] 添加适当的防抖和节流
- [ ] 优化网络请求
- **测试要点**: 响应时间、资源占用

#### 6.3 错误处理完善
- [ ] 完善所有模块的错误处理
- [ ] 添加用户友好的错误提示
- [ ] 实现错误日志记录
- [ ] 测试各种异常场景
- **测试要点**: 错误恢复能力、用户体验

### 阶段 7: 文档与部署

#### 7.1 更新文档
- [ ] 更新 CLAUDE.md 添加新功能说明
- [ ] 创建用户使用指南
- [ ] 更新开发文档
- [ ] 添加故障排查指南

#### 7.2 部署准备
- [ ] 确保环境变量配置正确
- [ ] 验证生产环境数据库配置
- [ ] 测试部署流程
- [ ] 准备回滚方案

## 开发规范
### 开发技术
● html
● 样式设计：Tailwindcss、CSS、；
  要实现响应式设计，采用 mobile-first（移动优先）策略；
  使用Tailwindcss，只有必要时才用原生CSS。
● UI组件库Shadcn UI，有合适组件直接使用Shadcn UI；
● JS框架：Nextjs，使用app router架构；
● 状态管理：Zustand，并将状态管理相关的配置都集中在一个store文件夹里。
● 数据库：supabase
● 编程思想：使用函数式编程；函数要高内聚、低耦合；

### 测试文件
测试文件放在根目录的test/目录下，统一管理（只有非常有必要的测试文件和配置文件才可以放在根目录下）

### git commit流程
首先，当你准备做git commit时，必须得到用户同意，即使处在Bypassing Permissions模式；
其次，git commit之前必须完成以下：
1. ✅ 代码实现完成
2. ✅ 单元测试通过
3. ✅ `npm run lint` 无错误
4. ✅ `npm run build` 构建成功
5. ✅ 功能测试通过

### 提交信息格式
```
feat(模块名): 实现功能描述

- 具体改动点1
- 具体改动点2
```

### 测试覆盖要求
- 核心功能测试覆盖率 > 80%
- 边界情况必须覆盖
- 错误处理必须测试

## 注意事项

1. **数据库操作**: Supabase 表已创建，无需执行建表 SQL
2. **认证集成**: 充分利用现有的 authStore
3. **向后兼容**: 确保现有功能不受影响
4. **渐进式改造**: 可以逐步迁移，不必一次完成所有模块
5. **用户体验**: 保持本地优先，快速响应的原则

