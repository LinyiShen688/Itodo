import { openDB } from "idb";

const DB_NAME = "iTodoApp";
const DB_VERSION = 5;

const STORES = {
  TASKS: "tasks",
  TASK_LISTS: "taskLists",
  SYNC_QUEUE: "syncQueue",
};

// 数据库初始化
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 任务存储
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, {
          keyPath: "id",
        });
        taskStore.createIndex("quadrant", "quadrant");
        taskStore.createIndex("listId", "listId");
        taskStore.createIndex("completed", "completed");
        taskStore.createIndex("deleted", "deleted");
        taskStore.createIndex("createdAt", "createdAt");
      }

      // 任务列表存储
      if (!db.objectStoreNames.contains(STORES.TASK_LISTS)) {
        const listStore = db.createObjectStore(STORES.TASK_LISTS, {
          keyPath: "id",
        });
        listStore.createIndex("isActive", "isActive");
        listStore.createIndex("deleted", "deleted");
        listStore.createIndex("createdAt", "createdAt");
      }

      // 版本升级处理
      if (oldVersion < 2 && db.objectStoreNames.contains(STORES.TASKS)) {
        // 为现有任务添加 estimatedTime 字段
        const taskStore = transaction.objectStore(STORES.TASKS);

        // 使用cursor遍历所有任务
        const request = taskStore.openCursor();
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const task = cursor.value;
            if (!task.hasOwnProperty("estimatedTime")) {
              task.estimatedTime = "";
              cursor.update(task);
            }
            cursor.continue();
          }
        };
      }

      // 版本3升级：添加deleted字段和索引
      if (oldVersion < 3 && db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = transaction.objectStore(STORES.TASKS);

        // 添加deleted索引（如果不存在）
        if (!taskStore.indexNames.contains("deleted")) {
          taskStore.createIndex("deleted", "deleted");
        }

        // 为现有任务添加 deleted 字段
        const request = taskStore.openCursor();
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const task = cursor.value;
            if (!task.hasOwnProperty("deleted")) {
              task.deleted = 0; // 0表示未删除，1表示已删除
              cursor.update(task);
            }
            cursor.continue();
          }
        };
      }

      // 版本4升级：为任务列表添加deleted字段
      if (oldVersion < 4 && db.objectStoreNames.contains(STORES.TASK_LISTS)) {
        const listStore = transaction.objectStore(STORES.TASK_LISTS);

        // 添加deleted索引
        if (!listStore.indexNames.contains("deleted")) {
          listStore.createIndex("deleted", "deleted");
        }

        // 为现有任务列表添加 deleted 字段
        const request = listStore.openCursor();
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const list = cursor.value;
            if (!list.hasOwnProperty("deleted")) {
              list.deleted = 0; // 0表示正常，2表示墓碑
              cursor.update(list);
            }
            cursor.continue();
          }
        };
      }

      // 版本5升级：添加同步队列存储
      if (oldVersion < 5) {
        // 创建同步队列存储
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: "id",
          });
          // 创建索引
          queueStore.createIndex("status", "status");
          queueStore.createIndex("createdAt", "createdAt");
          queueStore.createIndex("entityType", "entityType");
          queueStore.createIndex("action", "action");
        }
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
export async function getAllTasks(listId = "today", includeDeleted = false) {
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
  listId = "today",
  includeDeleted = false
) {
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
  const db = await initDB();

  const task = {
    id: generateId(),
    text: taskData.text || "",
    completed: 0, // false
    deleted: 0, // false
    quadrant: taskData.quadrant || 1,
    listId: taskData.listId || "today",
    estimatedTime: taskData.estimatedTime || "",
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

// 硬删除任务（永久删除）
export async function permanentDeleteTask(id) {
  const db = await initDB();
  await db.delete(STORES.TASKS, id);
}

// 恢复已删除的任务
export async function restoreTask(id) {
  return await updateTask(id, { deleted: 0 });
}

// 获取已删除的任务（收纳箱）
export async function getDeletedTasks(listId = "today") {
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
export async function addTaskList(name, layoutMode = "FOUR", showETA = true) {
  const db = await initDB();

  const taskList = {
    id: generateId(),
    name: name,
    isActive: 0, // false
    deleted: 0, // 0表示正常，2表示墓碑
    layoutMode,
    showETA,
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
