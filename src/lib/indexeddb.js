import { openDB } from 'idb';

const DB_NAME = 'iTodoApp';
const DB_VERSION = 2;

const STORES = {
  TASKS: 'tasks',
  TASK_LISTS: 'taskLists'
};

// 数据库初始化
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 任务存储
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, {
          keyPath: 'id'
        });
        taskStore.createIndex('quadrant', 'quadrant');
        taskStore.createIndex('listId', 'listId');
        taskStore.createIndex('completed', 'completed');
        taskStore.createIndex('createdAt', 'createdAt');
      }

      // 任务列表存储
      if (!db.objectStoreNames.contains(STORES.TASK_LISTS)) {
        const listStore = db.createObjectStore(STORES.TASK_LISTS, {
          keyPath: 'id'
        });
        listStore.createIndex('isActive', 'isActive');
        listStore.createIndex('createdAt', 'createdAt');
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
            if (!task.hasOwnProperty('estimatedTime')) {
              task.estimatedTime = '';
              cursor.update(task);
            }
            cursor.continue();
          }
        };
      }
    }
  });

  // 初始化默认任务列表
  await initDefaultTaskLists(db);
  
  return db;
}

// 初始化默认任务列表
async function initDefaultTaskLists(db) {
  const existingLists = await db.getAll(STORES.TASK_LISTS);
  
  if (existingLists.length === 0) {
    const defaultLists = [
      {
        id: 'today',
        name: '今天要做的事',
        isActive: 1, // true
        layoutMode: 'FOUR',
        showETA: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'AI',
        name: '让DeepSeek做的事',
        isActive: 0, // false
        layoutMode: 'FOUR',
        showETA: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'work',
        name: '工作的事',
        isActive: 0, // false
        layoutMode: 'FOUR',
        showETA: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const list of defaultLists) {
      await db.add(STORES.TASK_LISTS, list);
    }

    // 添加一些示例任务
    const defaultTasks = [
      {
        id: generateId(),
        text: '完成项目提案',
        completed: 1, // false
        quadrant: 1,
        listId: 'today',
        estimatedTime: '2小时',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0
      },
      {
        id: generateId(),
        text: '回复重要邮件',
        completed: 0, // false
        quadrant: 1,
        listId: 'today',
        estimatedTime: '30分钟',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 1
      },
      {
        id: generateId(),
        text: '学习新技能',
        completed: 0, // false
        quadrant: 2,
        listId: 'today',
        estimatedTime: '1小时',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0
      },
      {
        id: generateId(),
        text: '制定月度计划',
        completed: 0, // false
        quadrant: 2,
        listId: 'today',
        estimatedTime: '45分钟',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 1
      },
      {
        id: generateId(),
        text: '参加例会',
        completed: 0, // false
        quadrant: 3,
        listId: 'today',
        estimatedTime: '1小时',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0
      },
      {
        id: generateId(),
        text: '整理书架',
        completed: 0, // false
        quadrant: 4,
        listId: 'today',
        estimatedTime: '30分钟',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0
      },
      {
        id: generateId(),
        text: '让DeepSeek写一个一句话就可以生成3D模型的网站',
        completed: 0, // false
        quadrant: 1,
        listId: 'AI',
        estimatedTime: '24小时',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0
      }
    ];

    for (const task of defaultTasks) {
      await db.add(STORES.TASKS, task);
    }
  }
}

// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// === 任务操作 ===

// 获取所有任务（按象限和顺序排序）
export async function getAllTasks(listId = 'today') {
  const db = await initDB();
  const tasks = await db.getAllFromIndex(STORES.TASKS, 'listId', listId);
  
  // 按象限和order排序
  return tasks.sort((a, b) => {
    if (a.quadrant !== b.quadrant) {
      return a.quadrant - b.quadrant;
    }
    return a.order - b.order;
  });
}

// 获取指定象限的任务
export async function getTasksByQuadrant(quadrant, listId = 'today') {
  const db = await initDB();
  const allTasks = await db.getAllFromIndex(STORES.TASKS, 'listId', listId);
  
  return allTasks
    .filter(task => task.quadrant === quadrant)
    .sort((a, b) => a.order - b.order);
}

// 添加新任务
export async function addTask(taskData) {
  const db = await initDB();
  
  const task = {
    id: generateId(),
    text: taskData.text || '',
    completed: 0, // false
    quadrant: taskData.quadrant || 1,
    listId: taskData.listId || 'today',
    estimatedTime: taskData.estimatedTime || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: taskData.order || 0
  };

  await db.add(STORES.TASKS, task);
  return task;
}

// 更新任务
export async function updateTask(id, updates) {
  const db = await initDB();
  const task = await db.get(STORES.TASKS, id);
  
  if (!task) {
    throw new Error('Task not found');
  }

  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: new Date()
  };

  await db.put(STORES.TASKS, updatedTask);
  return updatedTask;
}

// 删除任务
export async function deleteTask(id) {
  const db = await initDB();
  await db.delete(STORES.TASKS, id);
}

// 移动任务到不同象限
export async function moveTaskToQuadrant(taskId, newQuadrant, newOrder = 0) {
  return await updateTask(taskId, {
    quadrant: newQuadrant,
    order: newOrder
  });
}

// 重新排序任务
export async function reorderTasks(tasks) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASKS, 'readwrite');
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    await tx.store.put({
      ...task,
      order: i,
      updatedAt: new Date()
    });
  }
  
  await tx.done;
}

// === 任务列表操作 ===

// 获取所有任务列表
export async function getAllTaskLists() {
  const db = await initDB();
  return await db.getAll(STORES.TASK_LISTS);
}

// 获取当前激活的任务列表
export async function getActiveTaskList() {
  const db = await initDB();
  const lists = await db.getAllFromIndex(STORES.TASK_LISTS, 'isActive', 1);
  return lists[0] || null;
}

// 添加新任务列表
export async function addTaskList(name, layoutMode = 'FOUR', showETA = true) {
  const db = await initDB();
  
  const taskList = {
    id: generateId(),
    name: name,
    isActive: 0, // false
    layoutMode,
    showETA,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.add(STORES.TASK_LISTS, taskList);
  return taskList;
}

// 更新任务列表
export async function updateTaskList(id, updates) {
  const db = await initDB();
  const taskList = await db.get(STORES.TASK_LISTS, id);
  
  if (!taskList) {
    throw new Error('Task list not found');
  }

  const updatedTaskList = {
    ...taskList,
    ...updates,
    updatedAt: new Date()
  };

  await db.put(STORES.TASK_LISTS, updatedTaskList);
  return updatedTaskList;
}

// 设置激活的任务列表
export async function setActiveTaskList(id) {
  const db = await initDB();
  const tx = db.transaction(STORES.TASK_LISTS, 'readwrite');
  
  // 先取消所有列表的激活状态
  const allLists = await tx.store.getAll();
  for (const list of allLists) {
    if (list.isActive || list.id === id) {
      await tx.store.put({
        ...list,
        isActive: list.id === id ? 1 : 0,
        updatedAt: new Date()
      });
    }
  }
  
  await tx.done;
  return await db.get(STORES.TASK_LISTS, id);
}

// 删除任务列表
export async function deleteTaskList(id) {
  const db = await initDB();
  const tx = db.transaction([STORES.TASK_LISTS, STORES.TASKS], 'readwrite');
  
  // 删除列表
  await tx.objectStore(STORES.TASK_LISTS).delete(id);
  
  // 删除该列表下的所有任务
  const tasks = await tx.objectStore(STORES.TASKS).index('listId').getAll(id);
  for (const task of tasks) {
    await tx.objectStore(STORES.TASKS).delete(task.id);
  }
  
  await tx.done;
} 