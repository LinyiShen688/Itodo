import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import 'fake-indexeddb/auto';
import { initDB, generateId } from '../../src/lib/indexeddb.js';

describe('IndexedDB Version 5 Upgrade', () => {
  let db;

  beforeEach(async () => {
    // 清理可能存在的数据库
    if (global.indexedDB.databases) {
      const dbs = await global.indexedDB.databases();
      for (const dbInfo of dbs) {
        await global.indexedDB.deleteDatabase(dbInfo.name);
      }
    }
  });

  afterEach(async () => {
    if (db) {
      db.close();
    }
    // 清理测试数据库
    await global.indexedDB.deleteDatabase('iTodoApp');
  });

  it('should create syncQueue store on upgrade to version 5', async () => {
    // 初始化数据库
    db = await initDB();
    
    // 验证数据库版本
    expect(db.version).toBe(5);
    
    // 验证syncQueue存储已创建
    expect(db.objectStoreNames.contains('syncQueue')).toBe(true);
  });

  it('should create all required indexes for syncQueue', async () => {
    db = await initDB();
    
    // 创建一个事务来访问存储
    const tx = db.transaction(['syncQueue'], 'readonly');
    const store = tx.objectStore('syncQueue');
    
    // 验证所有索引都已创建
    expect(store.indexNames.contains('status')).toBe(true);
    expect(store.indexNames.contains('createdAt')).toBe(true);
    expect(store.indexNames.contains('entityType')).toBe(true);
    expect(store.indexNames.contains('action')).toBe(true);
    
    await tx.done;
  });

  it('should preserve existing data during upgrade', async () => {
    // 先创建一些测试数据
    db = await initDB();
    
    // 添加任务
    const testTask = {
      id: generateId(),
      text: 'Test task',
      completed: 0,
      deleted: 0,
      quadrant: 1,
      listId: 'test-list',
      estimatedTime: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      order: 0
    };
    
    await db.add('tasks', testTask);
    
    // 添加任务列表
    const testList = {
      id: 'test-list',
      name: 'Test List',
      isActive: 1,
      deleted: 0,
      layoutMode: 'FOUR',
      showETA: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.add('taskLists', testList);
    
    // 验证数据存在
    const savedTask = await db.get('tasks', testTask.id);
    const savedList = await db.get('taskLists', testList.id);
    
    expect(savedTask).toBeDefined();
    expect(savedTask.text).toBe('Test task');
    expect(savedList).toBeDefined();
    expect(savedList.name).toBe('Test List');
  });

  it('should be able to add items to syncQueue', async () => {
    db = await initDB();
    
    // 创建同步队列项
    const queueItem = {
      id: generateId(),
      status: 'pending',
      action: 'add',
      entityType: 'task',
      entityId: generateId(),
      changes: { text: 'New task' },
      createdAt: new Date(),
      completedAt: null,
      retryCount: 0,
      error: null
    };
    
    // 添加到同步队列
    await db.add('syncQueue', queueItem);
    
    // 验证可以检索
    const savedItem = await db.get('syncQueue', queueItem.id);
    expect(savedItem).toBeDefined();
    expect(savedItem.status).toBe('pending');
    expect(savedItem.action).toBe('add');
    expect(savedItem.entityType).toBe('task');
  });

  it('should be able to query syncQueue by indexes', async () => {
    db = await initDB();
    
    // 添加多个队列项
    const items = [
      {
        id: generateId(),
        status: 'pending',
        action: 'add',
        entityType: 'task',
        entityId: generateId(),
        changes: { text: 'Task 1' },
        createdAt: new Date(),
        completedAt: null,
        retryCount: 0,
        error: null
      },
      {
        id: generateId(),
        status: 'completed',
        action: 'update',
        entityType: 'taskList',
        entityId: generateId(),
        changes: { name: 'Updated List' },
        createdAt: new Date(),
        completedAt: new Date(),
        retryCount: 0,
        error: null
      },
      {
        id: generateId(),
        status: 'failed',
        action: 'delete',
        entityType: 'task',
        entityId: generateId(),
        changes: {},
        createdAt: new Date(),
        completedAt: null,
        retryCount: 3,
        error: 'Network error'
      }
    ];
    
    for (const item of items) {
      await db.add('syncQueue', item);
    }
    
    // 按状态查询
    const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');
    expect(pendingItems.length).toBe(1);
    expect(pendingItems[0].status).toBe('pending');
    
    // 按实体类型查询
    const taskItems = await db.getAllFromIndex('syncQueue', 'entityType', 'task');
    expect(taskItems.length).toBe(2);
    
    // 按操作类型查询
    const updateItems = await db.getAllFromIndex('syncQueue', 'action', 'update');
    expect(updateItems.length).toBe(1);
    expect(updateItems[0].action).toBe('update');
  });
});