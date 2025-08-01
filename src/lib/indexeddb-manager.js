import { openDB } from "idb";

const DB_NAME = "iTodoApp";
const DB_VERSION = 1;

const STORES = {
  TASKS: "tasks",
  TASK_LISTS: "taskLists",
  SYNC_QUEUE: "syncQueue",
};

// 数据库初始化
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 任务存储 - 一次性创建完整结构
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, {
          keyPath: "id",
        });
        // 创建所有索引
        taskStore.createIndex("quadrant", "quadrant");
        taskStore.createIndex("listId", "listId");
        taskStore.createIndex("completed", "completed");
        taskStore.createIndex("deleted", "deleted");
        taskStore.createIndex("createdAt", "createdAt");
        taskStore.createIndex("userId", "userId");
      }

      // 任务列表存储 - 一次性创建完整结构
      if (!db.objectStoreNames.contains(STORES.TASK_LISTS)) {
        const listStore = db.createObjectStore(STORES.TASK_LISTS, {
          keyPath: "id",
        });
        // 创建所有索引
        listStore.createIndex("isActive", "isActive");
        listStore.createIndex("deleted", "deleted");
        listStore.createIndex("createdAt", "createdAt");
        listStore.createIndex("userId", "userId");
      }

      // 同步队列存储 - 一次性创建完整结构
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: "id",
        });
        // 创建所有索引
        queueStore.createIndex("status", "status");
        queueStore.createIndex("createdAt", "createdAt");
        queueStore.createIndex("entityType", "entityType");
        queueStore.createIndex("action", "action");
      }
    },
  });

  return db;
}

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

// === 任务操作 ===

// 获取所有任务（按象限和顺序排序，默认过滤已删除任务）
export async function getAllTasks(listId, includeDeleted = false) {
  if (!listId) throw new Error('listId is required');
  const db = await initDB();
  const tasks = await db.getAllFromIndex(STORES.TASKS, "listId", listId);

  // 过滤已删除的任务（除非明确要求包含）
  const filteredTasks = includeDeleted
    ? tasks
    : tasks.filter((task) => !task.deleted);

  // 按象限和order排序
  return filteredTasks.sort((a, b) => {
    if (a.quadrant !== b.quadrant) {
      return a.quadrant - b.quadrant;
    }
    return a.order - b.order;
  });
}

// 获取指定象限的任务
export async function getTasksByQuadrant(
  quadrant,
  listId,
  includeDeleted = false
) {
  if (!listId) throw new Error('listId is required');
  const db = await initDB();
  const allTasks = await db.getAllFromIndex(STORES.TASKS, "listId", listId);

  return allTasks
    .filter(
      (task) => task.quadrant === quadrant && (includeDeleted || !task.deleted)
    )
    .sort((a, b) => a.order - b.order);
}

// 添加新任务
export async function addTask(taskData) {
  if (!taskData.listId) throw new Error('listId is required');
  const db = await initDB();

  const task = {
    id: generateId(),
    text: taskData.text || "",
    completed: 0, // false
    deleted: 0, // false
    quadrant: taskData.quadrant || 1,
    listId: taskData.listId,
    estimatedTime: taskData.estimatedTime || "",
    userId: taskData.userId || null, // 添加 userId 字段
    createdAt: new Date(),
    updatedAt: new Date(),
    order: taskData.order || 0,
  };

  await db.add(STORES.TASKS, task);
  return task;
}

// 更新任务
export async function updateTask(id, updates) {
  const db = await initDB();
  const task = await db.get(STORES.TASKS, id);

  if (!task) {
    throw new Error("Task not found");
  }

  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: new Date(),
  };

  await db.put(STORES.TASKS, updatedTask);
  return updatedTask;
}

// 软删除任务（移到收纳箱）
export async function deleteTask(id) {
  return await updateTask(id, { deleted: 1 });
}

// 永久删除任务（使用墓碑模式）
export async function permanentDeleteTask(id) {
  return await updateTask(id, { deleted: 2 });
}

// 恢复已删除的任务
export async function restoreTask(id) {
  return await updateTask(id, { deleted: 0 });
}

// 获取已删除的任务（收纳箱）
export async function getDeletedTasks(listId) {
  if (!listId) throw new Error('listId is required');
  const db = await initDB();
  const allTasks = await db.getAllFromIndex(STORES.TASKS, "listId", listId);

  return allTasks
    .filter((task) => task.deleted === 1)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // 按删除时间倒序
}

// 获取所有列表的已删除任务
export async function getAllDeletedTasks() {
  const db = await initDB();
  const allTasks = await db.getAll(STORES.TASKS);

  return allTasks
    .filter((task) => task.deleted === 1)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // 按删除时间倒序
}

// 移动任务到不同象限
export async function moveTaskToQuadrant(taskId, newQuadrant, newOrder = 0) {
  return await updateTask(taskId, {
    quadrant: newQuadrant,
    order: newOrder,
  });
}

// 重新排序任务
export async function reorderTasks(tasks) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASKS, "readwrite");

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    await tx.store.put({
      ...task,
      order: i,
      updatedAt: new Date(),
    });
  }

  await tx.done;
}

// === 任务列表操作 ===

// 获取所有任务列表（不包含已删除的）
export async function getAllTaskLists() {
  const db = await initDB();
  const allLists = await db.getAll(STORES.TASK_LISTS);
  // 过滤掉已删除的列表 (deleted === 2 为墓碑状态)
  return allLists.filter(list => list.deleted !== 2);
}

// 获取当前激活的任务列表
export async function getActiveTaskList() {
  const db = await initDB();
  const lists = await db.getAllFromIndex(STORES.TASK_LISTS, "isActive", 1);
  // 确保返回的激活列表不是已删除的
  const activeList = lists.find(list => list.deleted !== 2);
  return activeList || null;
}

// 添加新任务列表
export async function addTaskList(name, layoutMode = "FOUR", showETA = true, userId = null) {
  const db = await initDB();

  const taskList = {
    id: generateId(),
    name: name,
    isActive: 0, // false
    deleted: 0, // 0表示正常，2表示墓碑
    layoutMode,
    showETA,
    userId: userId, // 添加 userId 字段
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.add(STORES.TASK_LISTS, taskList);
  return taskList;
}

// 更新任务列表
export async function updateTaskList(id, updates) {
  const db = await initDB();
  const taskList = await db.get(STORES.TASK_LISTS, id);

  if (!taskList) {
    throw new Error("Task list not found");
  }

  const updatedTaskList = {
    ...taskList,
    ...updates,
    updatedAt: new Date(),
  };

  await db.put(STORES.TASK_LISTS, updatedTaskList);
  return updatedTaskList;
}

// 设置激活的任务列表
export async function setActiveTaskList(id) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASK_LISTS, "readwrite");

  // 先检查要激活的列表是否存在且未被删除
  const targetList = await tx.store.get(id);
  if (!targetList || targetList.deleted === 2) {
    throw new Error("Cannot activate a deleted task list");
  }

  // 先取消所有列表的激活状态
  const allLists = await tx.store.getAll();
  for (const list of allLists) {
    if (list.isActive || list.id === id) {
      await tx.store.put({
        ...list,
        isActive: list.id === id ? 1 : 0,
        updatedAt: new Date(),
      });
    }
  }

  await tx.done;
  return await db.get(STORES.TASK_LISTS, id);
}

// 删除任务列表（软删除）
export async function deleteTaskList(id) {
  const db = await initDB();
  const tx = db.transaction([STORES.TASK_LISTS, STORES.TASKS], "readwrite");

  // 获取要删除的列表
  const listStore = tx.objectStore(STORES.TASK_LISTS);
  const taskList = await listStore.get(id);
  
  if (!taskList) {
    throw new Error("Task list not found");
  }

  // 标记列表为墓碑状态
  await listStore.put({
    ...taskList,
    deleted: 2, // 墓碑状态
    isActive: 0, // 取消激活状态
    updatedAt: new Date(),
  });

  // 标记该列表下的所有任务为墓碑状态
  const taskStore = tx.objectStore(STORES.TASKS);
  const tasks = await taskStore.index("listId").getAll(id);
  for (const task of tasks) {
    await taskStore.put({
      ...task,
      deleted: 2, // 墓碑状态
      updatedAt: new Date(),
    });
  }

  await tx.done;
}

// === 新增单项查询函数 ===

// 获取单个任务
export async function getTask(id) {
  const db = await openDB(DB_NAME, DB_VERSION);
  return await db.get(STORES.TASKS, id);
}

// 获取单个任务列表
export async function getTaskList(id) {
  const db = await openDB(DB_NAME, DB_VERSION);
  return await db.get(STORES.TASK_LISTS, id);
}

// === 新增直接插入函数（用于数据同步） ===

// 直接插入任务（不生成新ID，使用传入的完整数据）
export async function insertTask(taskData) {
  if (!taskData.listId) throw new Error('listId is required');
  const db = await openDB(DB_NAME, DB_VERSION);
  
  // 确保必要字段存在
  const task = {
    id: taskData.id,
    text: taskData.text || "",
    completed: taskData.completed || 0,
    deleted: taskData.deleted || 0,
    quadrant: taskData.quadrant || 1,
    listId: taskData.listId,
    estimatedTime: taskData.estimatedTime || "",
    order: taskData.order || 0,
    userId: taskData.userId || null, // 添加 userId 字段
    createdAt: taskData.createdAt || new Date(),
    updatedAt: taskData.updatedAt || new Date()
  };
  
  await db.add(STORES.TASKS, task);
  return task;
}

// 直接插入任务列表（不生成新ID，使用传入的完整数据）
export async function insertTaskList(listData) {
  const db = await openDB(DB_NAME, DB_VERSION);
  
  // 确保必要字段存在
  const list = {
    id: listData.id,
    name: listData.name,
    isActive: listData.isActive || 0,
    deleted: listData.deleted || 0,
    layoutMode: listData.layoutMode || "FOUR",
    showETA: listData.showETA !== false,
    userId: listData.userId || null, // 添加 userId 字段
    createdAt: listData.createdAt || new Date(),
    updatedAt: listData.updatedAt || new Date()
  };
  
  await db.add(STORES.TASK_LISTS, list);
  return list;
}

// === 移动任务相关函数 ===

// 移动任务到指定位置
export async function moveTask(taskId, fromQuadrant, toQuadrant, newOrder) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORES.TASKS, 'readwrite');
  const store = tx.objectStore(STORES.TASKS);
  
  try {
    // 获取要移动的任务
    const task = await store.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // 如果是同一象限内移动
    if (fromQuadrant === toQuadrant) {
      // 获取同象限内的所有任务
      const allTasks = await store.index('listId').getAll(task.listId);
      const quadrantTasks = allTasks
        .filter(t => t.quadrant === toQuadrant && !t.deleted && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      
      // 重新排序
      let orderIndex = 0;
      for (const t of quadrantTasks) {
        if (orderIndex === newOrder) {
          orderIndex++;
        }
        if (t.order !== orderIndex) {
          t.order = orderIndex;
          t.updatedAt = new Date();
          await store.put(t);
        }
        orderIndex++;
      }
      
      // 更新移动的任务
      task.order = newOrder;
      task.updatedAt = new Date();
      await store.put(task);
    } else {
      // 跨象限移动
      task.quadrant = toQuadrant;
      task.order = newOrder;
      task.updatedAt = new Date();
      await store.put(task);
      
      // 重新排序目标象限的任务
      const allTasks = await store.index('listId').getAll(task.listId);
      const targetQuadrantTasks = allTasks
        .filter(t => t.quadrant === toQuadrant && !t.deleted && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      
      let orderIndex = 0;
      for (const t of targetQuadrantTasks) {
        if (orderIndex === newOrder) {
          orderIndex++;
        }
        if (t.order !== orderIndex) {
          t.order = orderIndex;
          t.updatedAt = new Date();
          await store.put(t);
        }
        orderIndex++;
      }
    }
    
    await tx.done;
    return task;
  } catch (error) {
    console.error('Move task failed:', error);
    throw error;
  }
}

// === 获取 userId 为 null 的数据 ===

// 获取所有 userId 为 null 的任务
export async function getNullUserIdTasks() {
  const db = await initDB();
  const allTasks = await db.getAll(STORES.TASKS);
  
  // 过滤出 userId 为 null 或 undefined 的未删除任务
  return allTasks.filter(task => 
    (task.userId === null || task.userId === undefined || !('userId' in task)) && 
    task.deleted === 0
  );
}

// 获取所有 userId 为 null 的任务列表
export async function getNullUserIdTaskLists() {
  const db = await initDB();
  const allLists = await db.getAll(STORES.TASK_LISTS);
  
  // 过滤出 userId 为 null 或 undefined 的未删除任务列表
  return allLists.filter(list => 
    (list.userId === null || list.userId === undefined || !('userId' in list)) && 
    list.deleted === 0
  );
}

// 批量更新任务的 userId
export async function updateTasksUserId(taskIds, userId) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASKS, "readwrite");
  const store = tx.objectStore(STORES.TASKS);
  
  try {
    const updatePromises = taskIds.map(async (taskId) => {
      const task = await store.get(taskId);
      if (task) {
        task.userId = userId;
        task.updatedAt = new Date();
        return store.put(task);
      }
    });
    
    // 并行执行所有更新
    await Promise.all(updatePromises);
    await tx.done;
  } catch (error) {
    console.error('Update tasks userId failed:', error);
    throw error;
  }
}

// 批量更新任务列表的 userId
export async function updateTaskListsUserId(listIds, userId) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASK_LISTS, "readwrite");
  const store = tx.objectStore(STORES.TASK_LISTS);
  
  try {
    const updatePromises = listIds.map(async (listId) => {
      const list = await store.get(listId);
      if (list) {
        list.userId = userId;
        list.updatedAt = new Date();
        return store.put(list);
      }
    });
    
    // 并行执行所有更新
    await Promise.all(updatePromises);
    await tx.done;
  } catch (error) {
    console.error('Update task lists userId failed:', error);
    throw error;
  }
}