# iTodo 数据库表结构设计

## 1. 现有 IndexedDB 结构分析

### 数据库信息
- **数据库名**: iTodoApp
- **版本**: 3
- **存储空间**: tasks, taskLists

### Tasks 表结构 (IndexedDB)
```javascript
{
  id: string,              // 主键，生成的唯一ID (如: "lm2n3o4p5q")
  text: string,            // 任务内容 (如: "完成项目提案")
  completed: 0|1,          // 完成状态 (0=未完成, 1=完成)
  deleted: 0|1,            // 删除状态 (0=未删除, 1=已删除，用于软删除)
  quadrant: 1|2|3|4,       // 象限分类 (1=重要且紧急, 2=重要不紧急, 3=紧急不重要, 4=不重要不紧急)
  listId: string,          // 关联任务列表ID (外键，如: "today", "work")
  estimatedTime: string,   // 预计完成时间 (如: "2小时", "30分钟")
  order: number,           // 同象限内排序号 (0, 1, 2...)
  createdAt: Date,         // 创建时间
  updatedAt: Date          // 更新时间
}
```

### TaskLists 表结构 (IndexedDB)
```javascript
{
  id: string,              // 主键，列表标识符 (如: "today", "work", "AI")
  name: string,            // 列表显示名称 (如: "今天要做的事", "工作的事")
  isActive: 0|1,           // 是否为当前激活列表 (0=否, 1=是，同时只能有一个为1)
  layoutMode: string,      // 布局模式 (目前固定为 "FOUR")
  showETA: boolean,        // 是否显示预计时间 (true/false)
  createdAt: Date,         // 创建时间
  updatedAt: Date          // 更新时间
  // 注意：IndexedDB 版本没有 user_id，因为是本地存储，天然按用户隔离
}
```

### IndexedDB 索引
```javascript
// Tasks 表索引
- 'quadrant' (象限索引)
- 'listId' (任务列表ID索引)
- 'completed' (完成状态索引)
- 'deleted' (删除状态索引)
- 'createdAt' (创建时间索引)

// TaskLists 表索引
- 'isActive' (激活状态索引)
- 'createdAt' (创建时间索引)
```

## 2. Supabase 数据库设计

### 表结构转换对照

| IndexedDB | Supabase | 说明 |
|-----------|----------|------|
| - | user_id: UUID | **新增字段**，关联用户ID (来自auth.users) |
| completed: 0\|1 | completed: BOOLEAN | 数据类型转换 |
| deleted: 0\|1 | deleted: BOOLEAN | 数据类型转换 |
| isActive: 0\|1 | is_active: BOOLEAN | 字段名转换+数据类型转换 |
| listId | list_id | 字段名转换为下划线格式 |
| estimatedTime | estimated_time | 字段名转换为下划线格式 |
| layoutMode | layout_mode | 字段名转换为下划线格式 |
| showETA | show_eta | 字段名转换为下划线格式 |
| createdAt | created_at | 字段名转换+时间戳格式 |
| updatedAt | updated_at | 字段名转换+时间戳格式 |

## 3. Supabase SQL 创建语句

```sql
-- =============================================
-- 创建任务列表表 (task_lists)
-- =============================================
CREATE TABLE task_lists (
  id TEXT PRIMARY KEY,                                    -- 列表ID，与IndexedDB保持一致  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户ID，关联认证用户
  name TEXT NOT NULL,                                     -- 列表名称
  is_active BOOLEAN DEFAULT FALSE,                        -- 是否为当前激活列表
  layout_mode TEXT DEFAULT 'FOUR',                        -- 布局模式，目前固定为FOUR
  show_eta BOOLEAN DEFAULT TRUE,                          -- 是否显示预计完成时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- 创建时间，带时区
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()      -- 更新时间，带时区
);

-- 部分唯一索引：确保每个用户同时只能有一个激活列表
-- 只对 is_active = true 的记录创建唯一约束，允许多个 is_active = false
CREATE UNIQUE INDEX uniq_active_list ON task_lists(user_id) WHERE is_active;

-- =============================================
-- 创建任务表 (tasks)
-- =============================================
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                                    -- 任务ID，与IndexedDB保持一致
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户ID，关联认证用户
  text TEXT NOT NULL DEFAULT '',                          -- 任务内容
  completed BOOLEAN DEFAULT FALSE,                        -- 完成状态
  deleted BOOLEAN DEFAULT FALSE,                          -- 删除状态（软删除）
  quadrant INTEGER CHECK (quadrant >= 1 AND quadrant <= 4), -- 象限限制在1-4之间
  list_id TEXT REFERENCES task_lists(id) ON DELETE CASCADE, -- 外键，关联任务列表
  estimated_time TEXT DEFAULT '',                         -- 预计完成时间
  "order" INTEGER DEFAULT 0,                             -- 排序号，order是SQL关键字需要加引号
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- 创建时间，带时区
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()      -- 更新时间，带时区
  
  -- 注意：移除了子查询 CHECK 约束以提升性能
  -- 用户一致性由应用层确保：插入任务时验证 list_id 属于当前用户
);

-- =============================================
-- 创建核心索引（优化为小数据量场景）
-- =============================================

-- 基于实际数据量优化：单用户 ~700 任务，5-6 个列表
-- 过多索引会影响写入性能，对小数据量查询提升有限

-- 任务表核心索引（必需）
CREATE INDEX idx_tasks_user_list_quadrant ON tasks(user_id, list_id, quadrant, "order"); 
-- 这一个复合索引覆盖最常用查询：
--   - 按用户查询：user_id
--   - 按列表查询：user_id, list_id  
--   - 按象限查询：user_id, list_id, quadrant
--   - 排序查询：user_id, list_id, quadrant, order

-- 软删除查询索引（回收站功能必需）
CREATE INDEX idx_tasks_user_deleted ON tasks(user_id, deleted) WHERE deleted = true;
-- 部分索引：只为已删除的任务创建索引，节省空间

-- 任务列表表索引（必需）
CREATE INDEX idx_task_lists_user_id ON task_lists(user_id);

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
CREATE POLICY "Users can select/delete their own task lists" ON task_lists FOR SELECT USING (
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
-- 创建用户初始化函数 (当用户首次登录时调用)
-- =============================================
CREATE OR REPLACE FUNCTION initialize_user_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- 安全检查：确保只有认证用户能为自己初始化数据
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: User must be authenticated';
  END IF;
  
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Access denied: Users can only initialize their own data';
  END IF;

  -- 检查是否已经初始化过，避免重复初始化
  IF EXISTS (SELECT 1 FROM task_lists WHERE user_id = user_uuid LIMIT 1) THEN
    RAISE NOTICE 'User data already initialized for user %', user_uuid;
    RETURN;
  END IF;

  -- 为新用户创建默认任务列表（与 indexeddb.js 保持一致）
  INSERT INTO task_lists (id, user_id, name, is_active, layout_mode, show_eta) VALUES
  (user_uuid || '_today', user_uuid, '今天要做的事', true, 'FOUR', true),
  (user_uuid || '_Roadmap', user_uuid, '长期规划', false, 'SINGLE', true);

  -- 为新用户创建示例任务（与 indexeddb.js 保持一致）
  INSERT INTO tasks (id, user_id, text, completed, deleted, quadrant, list_id, estimated_time, "order") VALUES
  -- 今天要做的事
  (user_uuid || '_task_001', user_uuid, '打豆豆', false, false, 1, user_uuid || '_today', '2小时', 0),
  (user_uuid || '_task_002', user_uuid, '回复重要邮件', true, false, 1, user_uuid || '_today', '30分钟', 1),
  (user_uuid || '_task_003', user_uuid, '健身', false, false, 2, user_uuid || '_today', '30分钟', 0),

  -- 长期规划
  (user_uuid || '_task_004', user_uuid, '学习游泳', false, false, 1, user_uuid || '_Roadmap', '24小时', 0),
  (user_uuid || '_task_005', user_uuid, '制定月度计划', true, false, 1, user_uuid || '_Roadmap', '45分钟', 1);
  
  RAISE NOTICE 'Successfully initialized data for user %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 设置函数执行权限 (重要安全措施)
-- =============================================
-- 撤销公共访问权限
REVOKE EXECUTE ON FUNCTION initialize_user_data FROM PUBLIC;

-- 只允许认证用户执行
GRANT EXECUTE ON FUNCTION initialize_user_data TO authenticated;

-- =============================================
-- 常用查询示例 (包含用户过滤)
-- =============================================

-- 查询当前用户特定列表的所有未删除任务，按象限和顺序排序
-- SELECT * FROM tasks 
-- WHERE user_id = auth.uid() AND list_id = 'user_id_today' AND deleted = false 
-- ORDER BY quadrant, "order";

-- 查询当前用户特定象限的任务
-- SELECT * FROM tasks 
-- WHERE user_id = auth.uid() AND list_id = 'user_id_today' AND quadrant = 1 AND deleted = false 
-- ORDER BY "order";

-- 查询当前用户的激活任务列表
-- SELECT * FROM task_lists 
-- WHERE user_id = auth.uid() AND is_active = true 
-- LIMIT 1;

-- 查询当前用户的所有任务列表
-- SELECT * FROM task_lists 
-- WHERE user_id = auth.uid() 
-- ORDER BY created_at;

-- 查询当前用户已删除的任务（回收站）
-- SELECT * FROM tasks 
-- WHERE user_id = auth.uid() AND deleted = true 
-- ORDER BY updated_at DESC;

-- 查询当前用户的任务统计
-- SELECT 
--   tl.name as list_name,
--   COUNT(t.id) as total_tasks,
--   COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks,
--   COUNT(CASE WHEN t.deleted = true THEN 1 END) as deleted_tasks
-- FROM task_lists tl
-- LEFT JOIN tasks t ON tl.id = t.list_id AND t.user_id = tl.user_id
-- WHERE tl.user_id = auth.uid()
-- GROUP BY tl.id, tl.name
-- ORDER BY tl.created_at;
```

## 4. 数据迁移注意事项

### 数据类型转换
1. **Boolean 转换**: IndexedDB 的 0/1 需要转换为 Supabase 的 true/false
2. **时间戳格式**: IndexedDB 的 Date 对象需要转换为 ISO 字符串
3. **字段名转换**: 驼峰命名转为下划线格式
4. **时区统一**: 所有时间戳必须统一为 UTC，避免 LWW 冲突解决错误

### 迁移脚本示例
```javascript
// IndexedDB 数据转换为 Supabase 格式 (需要当前用户ID + 时区统一)
function convertTaskForSupabase(indexedDBTask, userId) {
  return {
    id: `${userId}_${indexedDBTask.id}`, // 确保ID全局唯一
    user_id: userId,                      // 添加用户ID
    text: indexedDBTask.text,
    completed: indexedDBTask.completed === 1,
    deleted: indexedDBTask.deleted === 1,
    quadrant: indexedDBTask.quadrant,
    list_id: `${userId}_${indexedDBTask.listId}`, // 更新列表ID引用
    estimated_time: indexedDBTask.estimatedTime,
    order: indexedDBTask.order,
    // 关键：确保时间戳转换为UTC ISO字符串，避免时区问题
    created_at: indexedDBTask.createdAt.toISOString(),   // 自动转换为UTC
    updated_at: indexedDBTask.updatedAt.toISOString()    // 自动转换为UTC
  };
}

function convertTaskListForSupabase(indexedDBTaskList, userId) {
  return {
    id: `${userId}_${indexedDBTaskList.id}`, // 确保ID全局唯一
    user_id: userId,                          // 添加用户ID
    name: indexedDBTaskList.name,
    is_active: indexedDBTaskList.isActive === 1,
    layout_mode: indexedDBTaskList.layoutMode,
    show_eta: indexedDBTaskList.showETA,
    created_at: indexedDBTaskList.createdAt.toISOString(),
    updated_at: indexedDBTaskList.updatedAt.toISOString()
  };
}

// 完整的数据迁移流程
async function migrateUserDataToSupabase(userId) {
  try {
    // 1. 获取本地数据
    const localTaskLists = await getAllTaskLists();
    const localTasks = await getAllTasks();

    // 2. 转换数据格式，添加用户ID
    const supabaseTaskLists = localTaskLists.map(list => 
      convertTaskListForSupabase(list, userId)
    );
    const supabaseTasks = localTasks.map(task => 
      convertTaskForSupabase(task, userId)
    );

    // 3. 批量插入到 Supabase
    const { error: listError } = await supabase
      .from('task_lists')
      .insert(supabaseTaskLists);
    
    if (listError) throw listError;

    const { error: taskError } = await supabase
      .from('tasks')
      .insert(supabaseTasks);
      
    if (taskError) throw taskError;

    // 4. 标记迁移完成
    localStorage.setItem(`migration_completed_${userId}`, 'true');
    
    return { success: true };
  } catch (error) {
    console.error('数据迁移失败:', error);
    return { success: false, error };
  }
}
```

## 5. 性能优化建议

### 5.1 索引策略（针对小数据量优化）
- **精简设计**: 从11个索引减少到3个核心索引
- **复合索引**: 一个核心复合索引覆盖多种查询场景
- **部分索引**: 只为已删除任务创建索引，节省空间
- **写性能优先**: 减少索引维护开销，提升写入性能

### 5.2 索引性能监控
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

### 5.3 数据量扩展策略
当单用户任务数超过 5000 时，考虑添加以下索引：
```sql
-- 大数据量时的补充索引
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 5.4 其他优化建议
- **批量操作**: 使用事务进行批量插入/更新
- **缓存策略**: 客户端实现适当的缓存机制
- **连接池**: 合理配置数据库连接池大小
- **定期清理**: 定期清理软删除的数据

## 6. 安全考虑

1. **RLS 策略**: 生产环境需要基于用户ID的行级安全策略
2. **数据验证**: 客户端和服务端都需要数据格式验证
3. **API 限制**: 设置适当的 API 调用频率限制