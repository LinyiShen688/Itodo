# iTodo 数据库表结构设计

## 1. 现有 IndexedDB 结构分析

### 数据库信息

- **数据库名**: iTodoApp
- **版本**: 1 (初始版本，包含所有功能)
- **存储空间**: tasks, taskLists, syncQueue

### Tasks 表结构 (IndexedDB)

```javascript
{
  id: string,              // 主键，使用 UUID v4 (如: "550e8400-e29b-41d4-a716-446655440000")
  text: string,            // 任务内容 (如: "完成项目提案")
  completed: 0|1,          // 完成状态 (0=未完成, 1=完成)
  deleted: 0|1|2,          // 删除状态 (0=正常, 1=收纳箱, 2=永久删除/墓碑)
  quadrant: 1|2|3|4,       // 象限分类 (1=重要且紧急, 2=重要不紧急, 3=紧急不重要, 4=不重要不紧急)
  listId: string,          // 关联任务列表ID (也是 UUID)
  estimatedTime: string,   // 预计完成时间 (如: "2小时", "30分钟")
  order: number,           // 同象限内排序号 (0, 1, 2...)
  createdAt: Date,         // 创建时间
  updatedAt: Date,         // 更新时间
  userId: string|null      // 用户ID (登录后为用户ID，未登录为null)
}
```

### TaskLists 表结构 (IndexedDB)

```javascript
{
  id: string,              // 主键，使用 UUID v4 (如: "660e8400-e29b-41d4-a716-446655440001")
  name: string,            // 列表显示名称 (如: "今天要做的事", "工作的事")
  isActive: 0|1,           // 是否为当前激活列表 (0=否, 1=是，同时只能有一个为1)
  deleted: 0|2,            // 删除状态 (0=正常, 2=墓碑，无需1收纳箱状态)
  layoutMode: string,      // 布局模式 (目前固定为 "FOUR")
  showETA: boolean,        // 是否显示预计时间 (true/false)
  createdAt: Date,         // 创建时间
  updatedAt: Date,         // 更新时间
  userId: string|null      // 用户ID (登录后为用户ID，未登录为null)
}
```

### SyncQueue 表结构 (IndexedDB) ← 新增

```javascript
{
  id: string,              // 主键，使用 UUID v4 (如: "770e8400-e29b-41d4-a716-446655440002")
  status: string,          // 同步状态 (pending|processing|completed|failed)
  action: string,          // 操作类型 (add|update|delete)
  entityType: string,      // 实体类型 (task|taskList)
  entityId: string,        // 目标实体的UUID
  changes: object,         // 变更字段（仅存储实际变更的字段，如: {text: "新内容", completed: 1}）
  // 对于add操作，存储完整对象；对于update操作，只存储变更字段；对于delete操作，只需entityId
  createdAt: Date,         // 创建时间
  completedAt: Date,       // 完成时间 (null 表示未完成)
  retryCount: number,      // 重试次数 (默认 0)
  error: string,           // 错误信息 (null 表示无错误)
  // 注意：同步队列不需要 updatedAt，因为状态转换是单向的
}
```

### IndexedDB 索引

```javascript
// Tasks 表索引
- "quadrant" (象限索引)
- "listId" (任务列表ID索引)
- "completed" (完成状态索引)
- "deleted" (删除状态索引)
- "createdAt" (创建时间索引)
- "userId" (用户ID索引)

// TaskLists 表索引
- "isActive" (激活状态索引)
- "deleted" (删除状态索引)
- "createdAt" (创建时间索引)
- "userId" (用户ID索引)

// SyncQueue 表索引 ← 新增
- "status" (同步状态索引) - 用于查询待处理/失败的项
- "createdAt" (创建时间索引) - 用于按时间排序
- "entityType" (实体类型索引) - 用于按类型过滤
- "action" (操作类型索引) - 用于按操作过滤
```

## 2. Supabase 数据库设计

### ID 统一设计

- **使用 UUID v4**：本地和云端使用相同的 UUID 生成策略
- **无需 ID 转换**：直接使用本地生成的 UUID 作为主键
- **避免冲突**：UUID 的极高唯一性保证多设备安全

### UUID v4 特点

- **标准格式**: `550e8400-e29b-41d4-a716-446655440000`
- **长度**: 36 字符（含连字符）
- **唯一性**: 极高，碰撞概率接近零
- **标准化**: 被所有主流数据库原生支持
- **性能影响**: 虽比短 ID 占用更多空间，但在现代应用中影响可忽略

### 表结构转换对照

| IndexedDB                  | Supabase           | 说明                                        |
| -------------------------- | ------------------ | ------------------------------------------- |
| id: string (UUID)          | id: UUID           | **PostgreSQL 原生 UUID 类型**，无需前缀     |
| -                          | user_id: UUID      | **新增字段**，关联用户 ID (来自 auth.users) |
| completed: 0\|1            | completed: BOOLEAN | 数据类型转换                                |
| deleted: 0\|1\|2           | deleted: SMALLINT  | 使用 SMALLINT 支持三种状态                  |
| deleted: 0\|2 (task_lists) | deleted: SMALLINT  | task_lists 只需 0 和 2 两种状态             |
| isActive: 0\|1             | is_active: BOOLEAN | 字段名转换+数据类型转换                     |
| listId                     | list_id            | 字段名转换为下划线格式                      |
| estimatedTime              | estimated_time     | 字段名转换为下划线格式                      |
| layoutMode                 | layout_mode        | 字段名转换为下划线格式                      |
| showETA                    | show_eta           | 字段名转换为下划线格式                      |
| createdAt                  | created_at         | 字段名转换+时间戳格式                       |
| updatedAt                  | updated_at         | 字段名转换+时间戳格式                       |

## 3. Supabase SQL 创建语句

```sql
-- =============================================
-- 启用 UUID 扩展（如果尚未启用）
-- =============================================
-- 注意：Supabase 通常已经启用了这个扩展
-- UUID 类型在 PostgreSQL 中是原生支持的，占用16字节
-- 比存储为 TEXT (36字节) 更高效
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 创建任务列表表 (task_lists)
-- =============================================
CREATE TABLE task_lists (
  id UUID PRIMARY KEY,                                    -- 使用 UUID 类型（前端生成）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户ID，关联认证用户
  name TEXT NOT NULL,                                     -- 列表名称
  is_active BOOLEAN DEFAULT FALSE,                        -- 是否为当前激活列表
  deleted SMALLINT DEFAULT 0 CHECK (deleted IN (0, 2)),   -- 删除状态 (0=正常, 2=墓碑)
  layout_mode TEXT DEFAULT 'FOUR',                        -- 布局模式，目前固定为FOUR
  show_eta BOOLEAN DEFAULT TRUE,                          -- 是否显示预计完成时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- 创建时间，带时区
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()      -- 更新时间，带时区
);

-- 部分唯一索引：确保每个用户同时只能有一个激活列表
-- 只对 is_active = true 且未删除的记录创建唯一约束
CREATE UNIQUE INDEX uniq_active_list ON task_lists(user_id) WHERE is_active = true AND deleted = 0;

-- =============================================
-- 创建任务表 (tasks)
-- =============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY,                                    -- 使用 UUID 类型（前端生成）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户ID，关联认证用户
  text TEXT NOT NULL DEFAULT '',                          -- 任务内容
  completed BOOLEAN DEFAULT FALSE,                        -- 完成状态
  deleted SMALLINT DEFAULT 0 CHECK (deleted IN (0, 1, 2)), -- 删除状态 (0=正常, 1=收纳箱, 2=墓碑)
  quadrant INTEGER CHECK (quadrant >= 1 AND quadrant <= 4), -- 象限限制在1-4之间
  list_id UUID REFERENCES task_lists(id) ON DELETE RESTRICT, -- 外键，改为RESTRICT防止级联删除
  estimated_time TEXT DEFAULT '',                         -- 预计完成时间
  "order" INTEGER DEFAULT 0,                             -- 排序号，order是SQL关键字需要加引号
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- 创建时间，带时区
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()      -- 更新时间，带时区

  -- 注意：ON DELETE RESTRICT 确保不会因为删除task_list而物理删除tasks
  -- 删除task_list时需要先将其下所有tasks标记为deleted=2
);

-- =============================================
-- 创建核心索引（优化为小数据量场景）
-- =============================================

-- 基于实际数据量优化：单用户 ~700 任务，5-6 个列表
-- 过多索引会影响写入性能，对小数据量查询提升有限

-- 任务表核心索引（重新设计）
-- 1. 用户索引（最基础的查询）
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- 2. 列表查询索引（获取某个列表的所有任务）
CREATE INDEX idx_tasks_user_list ON tasks(user_id, list_id)
WHERE deleted = 0;  -- 部分索引，只索引未删除的任务

-- 3. 象限排序索引（四象限视图查询）
CREATE INDEX idx_tasks_list_quadrant_order ON tasks(list_id, quadrant, "order")
WHERE deleted = 0;  -- 部分索引，提高查询效率

-- 4. 回收站索引（软删除查询）
CREATE INDEX idx_tasks_user_deleted ON tasks(user_id, deleted)
WHERE deleted = 1;  -- 只索引回收站中的任务

-- 5. 同步索引（用于增量同步）
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);

-- 任务列表表索引
-- 1. 用户查询索引
CREATE INDEX idx_task_lists_user_id ON task_lists(user_id);

-- 2. 激活列表查询索引
CREATE INDEX idx_task_lists_user_active ON task_lists(user_id, is_active)
WHERE is_active = true AND deleted = 0;  -- 部分索引，快速找到未删除的激活列表

-- 3. 未删除列表查询索引
CREATE INDEX idx_task_lists_user_deleted ON task_lists(user_id, deleted)
WHERE deleted = 0;  -- 部分索引，快速查询用户的正常列表

-- 4. 同步索引（用于增量同步）
CREATE INDEX idx_task_lists_updated_at ON task_lists(updated_at);

-- =============================================
-- 移除的索引及原因（在注释中保留，便于未来扩展）
-- =============================================
-- 以下索引在当前数据量下（~700任务/用户）收益不大：
--
-- CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
-- 原因：完成状态查询可通过主索引 + 应用层过滤，700条数据过滤很快
--
-- CREATE INDEX idx_tasks_created_at ON tasks(created_at);
-- 原因：按时间排序不是核心查询，且 order 字段已能满足排序需求
--
-- CREATE INDEX idx_tasks_order ON tasks("order");
-- 原因：order 排序已包含在复合索引中，单独的 order 索引冗余
--
-- CREATE INDEX idx_task_lists_created_at ON task_lists(created_at);
-- 原因：任务列表数量很少（5-6个），无需额外索引

-- 性能监控提醒：
-- 如果未来数据量增长（>5000任务/用户），考虑重新评估索引策略

-- =============================================
-- 启用行级安全 (Row Level Security, RLS)
-- =============================================
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 创建 RLS 策略 (基于用户身份的数据隔离)
-- =============================================

-- 任务列表表策略
-- SELECT/DELETE: 只能访问自己的数据
CREATE POLICY "Users can select their own task lists" ON task_lists FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete their own task lists" ON task_lists FOR DELETE USING (
  auth.uid() = user_id
);


-- INSERT: 只能插入属于自己的数据
CREATE POLICY "Users can insert their own task lists" ON task_lists FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: 只能更新自己的数据，且更新后仍然属于自己
CREATE POLICY "Users can update their own task lists" ON task_lists FOR UPDATE
  USING (auth.uid() = user_id)  -- 只能更新自己的数据
  WITH CHECK (auth.uid() = user_id);  -- 更新后必须仍然属于自己

-- 任务表策略
-- SELECT/DELETE: 只能访问自己的数据
CREATE POLICY "Users can select their own tasks" ON tasks FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (
  auth.uid() = user_id
);

-- INSERT: 只能插入属于自己的数据
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: 只能更新自己的数据，且更新后仍然属于自己
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE
  USING (auth.uid() = user_id)  -- 只能更新自己的数据
  WITH CHECK (auth.uid() = user_id);  -- 更新后必须仍然属于自己

-- =============================================
-- 创建更新时间触发器函数
-- =============================================
-- 更新时间触发器函数（确保使用UTC时间）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- 使用 NOW() 确保时间戳为服务器UTC时间，避免客户端时区差异
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为任务列表表添加更新时间触发器
CREATE TRIGGER update_task_lists_updated_at
    BEFORE UPDATE ON task_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为任务表添加更新时间触发器
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 注意：由于采用空态页设计，不再需要初始化函数
-- =============================================
-- 用户首次登录时不会创建任何默认数据
-- 所有任务列表和任务由用户主动创建

-- =============================================
-- 常用查询示例 (包含用户过滤)
-- =============================================

-- 查询当前用户特定列表的所有正常任务，按象限和顺序排序
-- SELECT * FROM tasks
-- WHERE user_id = auth.uid() AND list_id = 'user_id_today' AND deleted = 0
-- ORDER BY quadrant, "order";

-- 查询当前用户特定象限的任务
-- SELECT * FROM tasks
-- WHERE user_id = auth.uid() AND list_id = 'user_id_today' AND quadrant = 1 AND deleted = 0
-- ORDER BY "order";

-- 查询当前用户的激活任务列表
-- SELECT * FROM task_lists
-- WHERE user_id = auth.uid() AND is_active = true AND deleted = 0
-- LIMIT 1;

-- 查询当前用户的所有任务列表（不含已删除）
-- SELECT * FROM task_lists
-- WHERE user_id = auth.uid() AND deleted = 0
-- ORDER BY created_at;

-- 查询当前用户收纳箱的任务
-- SELECT * FROM tasks
-- WHERE user_id = auth.uid() AND deleted = 1
-- ORDER BY updated_at DESC;

-- 查询当前用户所有非墓碑任务（正常+收纳箱）
-- SELECT * FROM tasks
-- WHERE user_id = auth.uid() AND deleted < 2
-- ORDER BY deleted, updated_at DESC;

-- 查询当前用户的任务统计（只统计未删除的列表）
-- SELECT
--   tl.name as list_name,
--   COUNT(t.id) as total_tasks,
--   COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks,
--   COUNT(CASE WHEN t.deleted = 1 THEN 1 END) as trash_tasks,
--   COUNT(CASE WHEN t.deleted = 2 THEN 1 END) as tombstone_tasks
-- FROM task_lists tl
-- LEFT JOIN tasks t ON tl.id = t.list_id AND t.user_id = tl.user_id
-- WHERE tl.user_id = auth.uid() AND tl.deleted = 0
-- GROUP BY tl.id, tl.name
-- ORDER BY tl.created_at;
```

## 4. 数据迁移注意事项

### 数据类型转换

1. **ID 保持不变**: 使用 UUID 后，本地和云端使用相同的 ID
2. **Boolean 转换**: IndexedDB 的 0/1 需要转换为 Supabase 的 true/false（除了 deleted 字段）
3. **删除状态转换**:
   - tasks 的 deleted 字段保持数值类型（0/1/2）
   - task_lists 的 deleted 字段保持数值类型（0/2）
4. **时间戳格式**: IndexedDB 的 Date 对象需要转换为 ISO 字符串
5. **字段名转换**: 驼峰命名转为下划线格式
6. **时区统一**: 所有时间戳必须统一为 UTC，避免 LWW 冲突解决错误
7. **同步队列不迁移**: SyncQueue 表是本地专有的，不需要迁移到云端

### 迁移脚本示例

```javascript
// IndexedDB 数据转换为 Supabase 格式
function convertTaskForSupabase(indexedDBTask, userId) {
  return {
    id: indexedDBTask.id, // 直接使用 UUID，无需转换
    user_id: userId, // 添加用户ID
    text: indexedDBTask.text,
    completed: indexedDBTask.completed === 1,
    deleted: indexedDBTask.deleted, // 直接传递，支持 0/1/2 三种状态
    quadrant: indexedDBTask.quadrant,
    list_id: indexedDBTask.listId, // 直接使用 UUID
    estimated_time: indexedDBTask.estimatedTime,
    order: indexedDBTask.order,
    // 关键：确保时间戳转换为UTC ISO字符串，避免时区问题
    created_at: indexedDBTask.createdAt.toISOString(), // 自动转换为UTC
    updated_at: indexedDBTask.updatedAt.toISOString(), // 自动转换为UTC
  };
}

function convertTaskListForSupabase(indexedDBTaskList, userId) {
  return {
    id: indexedDBTaskList.id, // 直接使用 UUID，无需转换
    user_id: userId, // 添加用户ID
    name: indexedDBTaskList.name,
    is_active: indexedDBTaskList.isActive === 1,
    deleted: indexedDBTaskList.deleted || 0, // 处理deleted字段，默认为0
    layout_mode: indexedDBTaskList.layoutMode,
    show_eta: indexedDBTaskList.showETA,
    created_at: indexedDBTaskList.createdAt.toISOString(),
    updated_at: indexedDBTaskList.updatedAt.toISOString(),
  };
}

// 完整的数据迁移流程
async function migrateUserDataToSupabase(userId) {
  try {
    // 1. 获取本地数据（同步队列不需要迁移）
    const localTaskLists = await getAllTaskLists();
    const localTasks = await getAllTasks();
    // 注意：SyncQueue 不迁移，它是本地用于同步的临时数据

    // 2. 转换数据格式，添加用户ID
    const supabaseTaskLists = localTaskLists.map((list) =>
      convertTaskListForSupabase(list, userId)
    );
    const supabaseTasks = localTasks.map((task) =>
      convertTaskForSupabase(task, userId)
    );

    // 3. 批量插入到 Supabase
    const { error: listError } = await supabase
      .from("task_lists")
      .insert(supabaseTaskLists);

    if (listError) throw listError;

    const { error: taskError } = await supabase
      .from("tasks")
      .insert(supabaseTasks);

    if (taskError) throw taskError;

    // 4. 标记迁移完成
    localStorage.setItem(`migration_completed_${userId}`, "true");

    return { success: true };
  } catch (error) {
    console.error("数据迁移失败:", error);
    return { success: false, error };
  }
}
```

## 5. 墓碑模式设计

### 5.1 设计理念

采用"墓碑模式"处理永久删除，通过状态标记而非物理删除来实现数据的完全移除：

**Tasks 的删除状态**：

- **deleted = 0**: 正常状态，任务在主界面显示
- **deleted = 1**: 收纳箱状态，任务移到收纳箱但可恢复
- **deleted = 2**: 墓碑状态，永久删除但保留记录用于同步

**TaskLists 的删除状态**：

- **deleted = 0**: 正常状态，列表正常显示
- **deleted = 2**: 墓碑状态，列表被删除（无需收纳箱状态）

### 5.2 同步策略

```sql
-- 永久删除操作
-- 本地：UPDATE tasks SET deleted = 2 WHERE id = ?
-- 本地：UPDATE task_lists SET deleted = 2 WHERE id = ?
-- 云端：使用 UPSERT 同步墓碑数据

-- 删除task_list的完整流程
-- 1. UPDATE task_lists SET deleted = 2 WHERE id = ?
-- 2. UPDATE tasks SET deleted = 2 WHERE list_id = ?
-- 3. 两个操作都进入同步队列

-- 同步规则
-- 1. push: 所有行（含 deleted=2）都用 upsert 发送到云端
-- 2. pull: 收到 deleted=2 行时，本地直接 upsert 覆盖旧行
-- 3. 不做物理 DELETE 操作，确保同步一致性
-- 4. 外键约束(ON DELETE RESTRICT)防止意外物理删除
```

### 5.3 优势

1. **同步简单**: 统一使用 UPSERT，避免 DELETE 操作的复杂性
2. **数据一致性**: 墓碑记录确保离线/在线场景的最终一致性
3. **可追溯性**: 保留完整数据历史（如需要可定期清理）
4. **冲突避免**: 避免了删除-创建的同步冲突

## 6. 性能优化建议

### 6.1 索引策略（针对小数据量优化）

- **精简设计**: 从 11 个索引减少到 3 个核心索引
- **复合索引**: 一个核心复合索引覆盖多种查询场景
- **部分索引**: 只为已删除任务创建索引，节省空间
- **写性能优先**: 减少索引维护开销，提升写入性能

### 6.2 UUID 性能考虑

| 方面     | 影响                               | 缓解措施                     |
| -------- | ---------------------------------- | ---------------------------- |
| 存储空间 | UUID 占用 36 字符 vs 短 ID 10 字符 | 现代设备存储充足，影响可忽略 |
| 索引性能 | UUID 无序，可能影响 B 树索引       | 使用时间戳作为辅助排序字段   |
| 网络传输 | 比短 ID 多传输约 26 字节/记录      | gzip 压缩可减少 50%+传输量   |

**关于 UUID 版本选择**:

- **当前使用 UUID v4**：成熟稳定，所有平台原生支持
- **UUID v7 考虑**：虽然有时间排序优势，但：
  - Supabase/PostgreSQL 需要额外扩展支持
  - 前端需要引入第三方库
  - 对于每用户几百条数据的场景，性能提升有限
- **结论**：当前数据量下 UUID v4 完全够用

**优化建议**:

1. **使用时间戳排序**：不依赖 UUID 排序，使用 created_at/updated_at
2. **批量操作**：减少网络往返次数
3. **启用压缩**：HTTP gzip 压缩可大幅减少 UUID 的传输开销

### 6.3 索引性能监控

```sql
-- 监控慢查询（定期检查）
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%tasks%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 检查索引使用情况
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,  -- 索引扫描次数
  idx_tup_read  -- 索引读取行数
FROM pg_stat_user_indexes
WHERE tablename IN ('tasks', 'task_lists')
ORDER BY idx_scan DESC;

-- 识别未使用的索引（考虑删除）
SELECT
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND tablename IN ('tasks', 'task_lists');
```

### 6.4 数据量扩展策略

当单用户任务数超过 5000 时，考虑添加以下索引：

```sql
-- 大数据量时的补充索引
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 6.5 其他优化建议

- **批量操作**: 使用事务进行批量插入/更新
- **缓存策略**: 客户端实现适当的缓存机制
- **连接池**: 合理配置数据库连接池大小
- **定期清理**: 定期清理软删除的数据

## 7. 同步队列表结构说明

### SyncQueue 表的作用

同步队列是本地专有的表，用于：

- 记录待同步到云端的操作
- 保证离线操作不丢失
- 支持操作重试和错误处理
- 提供同步状态追踪

### 同步队列状态说明

- **pending**: 等待同步的操作
- **processing**: 正在同步中
- **completed**: 同步成功
- **failed**: 同步失败，需要手动处理

注：具体的同步机制实现请参考 code-design-plan.md 文档。

## 8. 安全考虑

1. **RLS 策略**: 生产环境需要基于用户 ID 的行级安全策略
2. **数据验证**: 客户端和服务端都需要数据格式验证
3. **API 限制**: 设置适当的 API 调用频率限制
4. **同步队列安全**: 同步队列不包含敏感信息，只在本地存储
5. **级联删除防护**: 使用 ON DELETE RESTRICT 防止意外的数据级联删除
6. **软删除保护**: 所有删除操作都是软删除，保证数据可恢复性
