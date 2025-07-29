/**
 * 数据格式转换函数测试
 * 测试 IndexedDB 和 Supabase 之间的双向数据转换
 */

import {
  convertIndexedDBToSupabase,
  convertSupabaseToIndexedDB
} from '../../src/lib/data-converters.js';

describe('数据格式转换函数测试', () => {
  
  const testUserId = 'test-user-123';
  
  // 测试数据
  const sampleIndexedDBTask = {
    id: 'task-123',
    text: '完成项目提案',
    completed: 1,
    deleted: 0,
    quadrant: 1,
    listId: 'list-456',
    estimatedTime: '2小时',
    order: 0,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T11:30:00Z')
  };

  const sampleSupabaseTask = {
    id: 'task-123',
    user_id: 'test-user-123',
    text: '完成项目提案',
    completed: true,
    deleted: 0,
    quadrant: 1,
    list_id: 'list-456',
    estimated_time: '2小时',
    order: 0,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T11:30:00.000Z'
  };

  const sampleIndexedDBTaskList = {
    id: 'list-456',
    name: '今天要做的事',
    isActive: 1,
    deleted: 0,
    layoutMode: 'FOUR',
    showETA: true,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T09:00:00Z')
  };

  const sampleSupabaseTaskList = {
    id: 'list-456',
    user_id: 'test-user-123',
    name: '今天要做的事',
    is_active: true,
    deleted: 0,
    layout_mode: 'FOUR',
    show_eta: true,
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z'
  };

  describe('convertIndexedDBToSupabase()', () => {
    
    test('应该正确转换任务数据', () => {
      const result = convertIndexedDBToSupabase(sampleIndexedDBTask, testUserId);
      
      expect(result.id).toBe('task-123');
      expect(result.user_id).toBe('test-user-123');
      expect(result.text).toBe('完成项目提案');
      expect(result.completed).toBe(true);
      expect(result.deleted).toBe(0);
      expect(result.quadrant).toBe(1);
      expect(result.list_id).toBe('list-456');
      expect(result.estimated_time).toBe('2小时');
      expect(result.order).toBe(0);
      expect(result.created_at).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updated_at).toBe('2024-01-15T11:30:00.000Z');
    });

    test('应该正确转换任务列表数据', () => {
      const result = convertIndexedDBToSupabase(sampleIndexedDBTaskList, testUserId);
      
      expect(result.id).toBe('list-456');
      expect(result.user_id).toBe('test-user-123');
      expect(result.name).toBe('今天要做的事');
      expect(result.is_active).toBe(true);
      expect(result.deleted).toBe(0);
      expect(result.layout_mode).toBe('FOUR');
      expect(result.show_eta).toBe(true);
      expect(result.created_at).toBe('2024-01-15T09:00:00.000Z');
      expect(result.updated_at).toBe('2024-01-15T09:00:00.000Z');
    });

    test('应该正确转换completed字段（0/1 -> boolean）', () => {
      const uncompletedTask = { ...sampleIndexedDBTask, completed: 0 };
      const result = convertIndexedDBToSupabase(uncompletedTask, testUserId);
      
      expect(result.completed).toBe(false);
    });

    test('应该正确转换isActive字段（0/1 -> boolean）', () => {
      const inactiveList = { ...sampleIndexedDBTaskList, isActive: 0 };
      const result = convertIndexedDBToSupabase(inactiveList, testUserId);
      
      expect(result.is_active).toBe(false);
    });

    test('应该拒绝无效输入', () => {
      expect(() => convertIndexedDBToSupabase(null, testUserId)).toThrow('Invalid data');
      expect(() => convertIndexedDBToSupabase(sampleIndexedDBTask, null)).toThrow('Invalid userId');
      expect(() => convertIndexedDBToSupabase(sampleIndexedDBTask, 123)).toThrow('Invalid userId');
    });
  });

  describe('convertSupabaseToIndexedDB()', () => {
    
    test('应该正确转换任务数据', () => {
      const result = convertSupabaseToIndexedDB(sampleSupabaseTask);
      
      expect(result.id).toBe('task-123');
      expect(result.text).toBe('完成项目提案');
      expect(result.completed).toBe(1);
      expect(result.deleted).toBe(0);
      expect(result.quadrant).toBe(1);
      expect(result.listId).toBe('list-456');
      expect(result.estimatedTime).toBe('2小时');
      expect(result.order).toBe(0);
      expect(result.createdAt).toEqual(new Date('2024-01-15T10:30:00.000Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-15T11:30:00.000Z'));
    });

    test('应该正确转换任务列表数据', () => {
      const result = convertSupabaseToIndexedDB(sampleSupabaseTaskList);
      
      expect(result.id).toBe('list-456');
      expect(result.name).toBe('今天要做的事');
      expect(result.isActive).toBe(1);
      expect(result.deleted).toBe(0);
      expect(result.layoutMode).toBe('FOUR');
      expect(result.showETA).toBe(true);
      expect(result.createdAt).toEqual(new Date('2024-01-15T09:00:00.000Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-15T09:00:00.000Z'));
    });

    test('应该正确转换completed字段（boolean -> 0/1）', () => {
      const uncompletedTask = { ...sampleSupabaseTask, completed: false };
      const result = convertSupabaseToIndexedDB(uncompletedTask);
      
      expect(result.completed).toBe(0);
    });

    test('应该正确转换is_active字段（boolean -> 0/1）', () => {
      const inactiveList = { ...sampleSupabaseTaskList, is_active: false };
      const result = convertSupabaseToIndexedDB(inactiveList);
      
      expect(result.isActive).toBe(0);
    });

    test('应该处理estimatedTime默认值', () => {
      const taskWithoutTime = { ...sampleSupabaseTask };
      delete taskWithoutTime.estimated_time;
      
      const result = convertSupabaseToIndexedDB(taskWithoutTime);
      expect(result.estimatedTime).toBe('');
    });

    test('应该处理layoutMode默认值', () => {
      const listWithoutLayout = { ...sampleSupabaseTaskList };
      delete listWithoutLayout.layout_mode;
      
      const result = convertSupabaseToIndexedDB(listWithoutLayout);
      expect(result.layoutMode).toBe('FOUR');
    });

    test('应该处理showETA默认值', () => {
      const listWithoutETA = { ...sampleSupabaseTaskList };
      delete listWithoutETA.show_eta;
      
      const result = convertSupabaseToIndexedDB(listWithoutETA);
      expect(result.showETA).toBe(true);
    });

    test('应该拒绝无效输入', () => {
      expect(() => convertSupabaseToIndexedDB(null)).toThrow('Invalid data');
      expect(() => convertSupabaseToIndexedDB(undefined)).toThrow('Invalid data');
      expect(() => convertSupabaseToIndexedDB('string')).toThrow('Invalid data');
    });
  });

  describe('双向转换一致性测试', () => {
    test('任务数据双向转换应该保持一致', () => {
      // IndexedDB -> Supabase -> IndexedDB
      const supabaseFormat = convertIndexedDBToSupabase(sampleIndexedDBTask, testUserId);
      const backToIndexedDB = convertSupabaseToIndexedDB(supabaseFormat);
      
      // 比较关键字段（忽略 user_id 因为它不在 IndexedDB 中）
      expect(backToIndexedDB.id).toBe(sampleIndexedDBTask.id);
      expect(backToIndexedDB.text).toBe(sampleIndexedDBTask.text);
      expect(backToIndexedDB.completed).toBe(sampleIndexedDBTask.completed);
      expect(backToIndexedDB.quadrant).toBe(sampleIndexedDBTask.quadrant);
      expect(backToIndexedDB.listId).toBe(sampleIndexedDBTask.listId);
      expect(backToIndexedDB.estimatedTime).toBe(sampleIndexedDBTask.estimatedTime);
    });

    test('任务列表数据双向转换应该保持一致', () => {
      // IndexedDB -> Supabase -> IndexedDB
      const supabaseFormat = convertIndexedDBToSupabase(sampleIndexedDBTaskList, testUserId);
      const backToIndexedDB = convertSupabaseToIndexedDB(supabaseFormat);
      
      expect(backToIndexedDB.id).toBe(sampleIndexedDBTaskList.id);
      expect(backToIndexedDB.name).toBe(sampleIndexedDBTaskList.name);
      expect(backToIndexedDB.isActive).toBe(sampleIndexedDBTaskList.isActive);
      expect(backToIndexedDB.layoutMode).toBe(sampleIndexedDBTaskList.layoutMode);
      expect(backToIndexedDB.showETA).toBe(sampleIndexedDBTaskList.showETA);
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空字符串', () => {
      const taskWithEmptyText = { ...sampleIndexedDBTask, text: '', estimatedTime: '' };
      const result = convertIndexedDBToSupabase(taskWithEmptyText, testUserId);
      
      expect(result.text).toBe('');
      expect(result.estimated_time).toBe('');
    });

    test('应该处理数值边界', () => {
      const taskWithBoundaryValues = {
        ...sampleIndexedDBTask,
        completed: 0,
        deleted: 2,
        quadrant: 4,
        order: 999
      };
      
      const result = convertIndexedDBToSupabase(taskWithBoundaryValues, testUserId);
      
      expect(result.completed).toBe(false);
      expect(result.deleted).toBe(2);
      expect(result.quadrant).toBe(4);
      expect(result.order).toBe(999);
    });

    test('应该处理时间戳转换', () => {
      const task = convertIndexedDBToSupabase(sampleIndexedDBTask, testUserId);
      const backToIndexedDB = convertSupabaseToIndexedDB(task);
      
      expect(backToIndexedDB.createdAt).toBeInstanceOf(Date);
      expect(backToIndexedDB.updatedAt).toBeInstanceOf(Date);
      expect(backToIndexedDB.createdAt.getTime()).toBe(sampleIndexedDBTask.createdAt.getTime());
      expect(backToIndexedDB.updatedAt.getTime()).toBe(sampleIndexedDBTask.updatedAt.getTime());
    });
  });
});