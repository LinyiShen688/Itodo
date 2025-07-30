/**
 * Supabase 数据层单元测试
 * 
 * 注意：这些测试需要模拟 Supabase 客户端，因为我们不想在测试中进行实际的数据库操作
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn()
  }))
}));

// Mock data converters
jest.mock('../../src/lib/data-converters', () => ({
  convertIndexedDBToSupabase: jest.fn((data, userId) => ({
    ...data,
    user_id: userId,
    list_id: data.listId,
    is_active: data.isActive === 1,
    completed: data.completed === 1,
    estimated_time: data.estimatedTime,
    layout_mode: data.layoutMode,
    show_eta: data.showETA,
    created_at: data.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toISOString() || new Date().toISOString()
  })),
  convertSupabaseToIndexedDB: jest.fn((data) => ({
    ...data,
    listId: data.list_id,
    isActive: data.is_active ? 1 : 0,
    completed: data.completed ? 1 : 0,
    estimatedTime: data.estimated_time,
    layoutMode: data.layout_mode,
    showETA: data.show_eta,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }))
}));

import * as supabaseDb from '../../src/lib/supabase-db.js';
import { createClient } from '@/lib/supabase/client';

describe('Supabase 数据层', () => {
  let mockSupabaseClient;
  let mockFrom;
  let mockSelect;
  let mockInsert;
  let mockUpdate;
  let mockEq;
  let mockNeq;
  let mockGt;
  let mockOrder;
  let mockSingle;

  beforeEach(() => {
    // 清理所有模拟
    jest.clearAllMocks();

    // 设置链式调用的模拟
    mockSingle = jest.fn(() => ({ data: {}, error: null }));
    mockOrder = jest.fn().mockReturnThis();
    mockGt = jest.fn().mockReturnThis();
    mockNeq = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockSelect = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    
    // 创建一个完整的查询链对象
    const queryChain = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      neq: mockNeq,
      gt: mockGt,
      order: mockOrder,
      single: mockSingle,
      data: [],
      error: null,
      count: 0
    };

    // 设置所有方法返回 queryChain
    mockSelect.mockReturnValue(queryChain);
    mockInsert.mockReturnValue(queryChain);
    mockUpdate.mockReturnValue(queryChain);
    mockEq.mockReturnValue(queryChain);
    mockNeq.mockReturnValue(queryChain);
    mockGt.mockReturnValue(queryChain);
    mockOrder.mockReturnValue(queryChain);
    
    mockFrom = jest.fn(() => queryChain);

    // 设置 Supabase 客户端模拟
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: 'test-user-id' } }
        }))
      },
      from: mockFrom
    };

    // 模拟 createClient
    createClient.mockReturnValue(mockSupabaseClient);
  });

  describe('任务操作', () => {
    it('应该获取任务列表', async () => {
      const mockTasks = [
        { 
          id: 'task-1', 
          text: 'Test task', 
          completed: false,
          list_id: 'list-1',
          user_id: 'test-user-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // 设置最终返回的数据
      mockOrder.mockReturnValueOnce({
        ...mockOrder.mock.results[0].value,
        data: mockTasks,
        error: null
      });

      const result = await supabaseDb.getSupabaseTasks('list-1');

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-id');
      expect(mockEq).toHaveBeenCalledWith('list_id', 'list-1');
      expect(result).toHaveLength(1);
      expect(result[0].listId).toBe('list-1');
    });

    it('应该添加新任务', async () => {
      const newTask = {
        id: 'new-task',
        text: 'New task',
        completed: 0,
        quadrant: 1,
        listId: 'list-1',
        order: 0
      };

      // 模拟验证任务列表归属
      mockFrom.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { user_id: 'test-user-id' },
              error: null
            }))
          }))
        }))
      });

      // 模拟插入任务
      mockFrom.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { ...newTask, user_id: 'test-user-id', list_id: 'list-1' },
              error: null
            }))
          }))
        }))
      });

      const result = await supabaseDb.addSupabaseTask(newTask);

      expect(result).toBeDefined();
      expect(result.listId).toBe('list-1');
    });

    it('应该更新任务', async () => {
      const updates = { text: 'Updated task', completed: 1 };

      // 模拟验证任务归属
      mockFrom.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { user_id: 'test-user-id' },
              error: null
            }))
          }))
        }))
      });

      // 模拟更新任务
      mockSingle.mockReturnValueOnce({
        data: { id: 'task-1', ...updates, user_id: 'test-user-id' },
        error: null
      });

      const result = await supabaseDb.updateSupabaseTask('task-1', updates);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('应该软删除任务', async () => {
      // 模拟验证和更新
      mockFrom.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { user_id: 'test-user-id' },
              error: null
            }))
          }))
        }))
      });

      mockSingle.mockReturnValueOnce({
        data: { id: 'task-1', deleted: 1 },
        error: null
      });

      const result = await supabaseDb.deleteSupabaseTask('task-1', false);

      expect(result).toBeDefined();
      expect(result.deleted).toBe(1);
    });

    it('应该永久删除任务（墓碑）', async () => {
      // 模拟验证和更新
      mockFrom.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { user_id: 'test-user-id' },
              error: null
            }))
          }))
        }))
      });

      mockSingle.mockReturnValueOnce({
        data: { id: 'task-1', deleted: 2 },
        error: null
      });

      const result = await supabaseDb.deleteSupabaseTask('task-1', true);

      expect(result).toBeDefined();
      expect(result.deleted).toBe(2);
    });
  });

  describe('任务列表操作', () => {
    it('应该获取所有任务列表', async () => {
      const mockLists = [
        { 
          id: 'list-1', 
          name: 'Test List',
          is_active: true,
          user_id: 'test-user-id'
        }
      ];

      mockOrder.mockReturnValueOnce({
        data: mockLists,
        error: null
      });

      const result = await supabaseDb.getSupabaseTaskLists();

      expect(mockFrom).toHaveBeenCalledWith('task_lists');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test List');
    });

    it('应该添加新任务列表', async () => {
      const mockNewList = {
        id: expect.any(String),
        name: 'New List',
        user_id: 'test-user-id',
        is_active: false,
        deleted: 0,
        layout_mode: 'FOUR',
        show_eta: true
      };

      mockSingle.mockReturnValueOnce({
        data: mockNewList,
        error: null
      });

      const result = await supabaseDb.addSupabaseTaskList('New List');

      expect(result).toBeDefined();
      expect(result.name).toBe('New List');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('应该设置激活的任务列表', async () => {
      // 模拟取消所有激活
      mockEq.mockReturnValueOnce({
        error: null
      });

      // 模拟激活指定列表
      mockSingle.mockReturnValueOnce({
        data: { id: 'list-1', is_active: true },
        error: null
      });

      const result = await supabaseDb.setSupabaseActiveTaskList('list-1');

      expect(result).toBeDefined();
      expect(result.isActive).toBe(1);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('应该删除任务列表（包括任务）', async () => {
      // 模拟删除所有任务
      mockEq.mockReturnValueOnce({
        eq: jest.fn(() => ({
          error: null
        }))
      });

      // 模拟删除任务列表
      mockSingle.mockReturnValueOnce({
        data: { id: 'list-1', deleted: 2 },
        error: null
      });

      const result = await supabaseDb.deleteSupabaseTaskList('list-1');

      expect(result).toBeDefined();
      expect(result.deleted).toBe(2);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('数据验证', () => {
    it('应该验证任务列表归属', async () => {
      mockSingle.mockReturnValueOnce({
        data: { user_id: 'test-user-id' },
        error: null
      });

      const result = await supabaseDb.validateTaskListOwnership('list-1', 'test-user-id');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('task_lists');
    });

    it('应该拒绝非法的任务列表访问', async () => {
      mockSingle.mockReturnValueOnce({
        data: { user_id: 'other-user-id' },
        error: null
      });

      await expect(
        supabaseDb.validateTaskListOwnership('list-1', 'test-user-id')
      ).rejects.toThrow('Access denied');
    });

    it('应该验证任务归属', async () => {
      mockSingle.mockReturnValueOnce({
        data: { user_id: 'test-user-id' },
        error: null
      });

      const result = await supabaseDb.validateTaskOwnership('task-1', 'test-user-id');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('tasks');
    });
  });

  describe('批量操作', () => {
    it('应该批量插入任务', async () => {
      const tasks = [
        { id: 'task-1', text: 'Task 1' },
        { id: 'task-2', text: 'Task 2' }
      ];

      mockSelect.mockReturnValueOnce({
        data: tasks.map(t => ({ ...t, user_id: 'test-user-id' })),
        error: null
      });

      const result = await supabaseDb.batchInsertTasks(tasks, 'test-user-id');

      expect(result).toHaveLength(2);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('应该批量插入任务列表', async () => {
      const lists = [
        { id: 'list-1', name: 'List 1' },
        { id: 'list-2', name: 'List 2' }
      ];

      mockSelect.mockReturnValueOnce({
        data: lists.map(l => ({ ...l, user_id: 'test-user-id' })),
        error: null
      });

      const result = await supabaseDb.batchInsertTaskLists(lists, 'test-user-id');

      expect(result).toHaveLength(2);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理认证错误', async () => {
      mockSupabaseClient.auth.getUser.mockReturnValueOnce({
        data: { user: null }
      });

      await expect(supabaseDb.getSupabaseTasks('list-1')).rejects.toThrow('User not authenticated');
    });

    it('应该处理数据库错误', async () => {
      mockEq.mockReturnValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(supabaseDb.getSupabaseTasks('list-1')).rejects.toThrow('Database error');
    });

    it('应该处理验证错误', async () => {
      mockSingle.mockReturnValueOnce({
        data: null,
        error: new Error('Not found')
      });

      await expect(
        supabaseDb.validateTaskListOwnership('list-1', 'test-user-id')
      ).rejects.toThrow('Task list not found');
    });
  });

  describe('同步相关查询', () => {
    it('应该获取更新的任务', async () => {
      const mockUpdatedTasks = [
        { id: 'task-1', updated_at: '2024-01-01T12:00:00Z' }
      ];

      mockOrder.mockReturnValueOnce({
        data: mockUpdatedTasks,
        error: null
      });

      const result = await supabaseDb.getUpdatedTasks('test-user-id', '2024-01-01T00:00:00Z');

      expect(result).toHaveLength(1);
      expect(mockGt).toHaveBeenCalledWith('updated_at', '2024-01-01T00:00:00Z');
    });

    it('应该获取更新的任务列表', async () => {
      const mockUpdatedLists = [
        { id: 'list-1', updated_at: '2024-01-01T12:00:00Z' }
      ];

      mockOrder.mockReturnValueOnce({
        data: mockUpdatedLists,
        error: null
      });

      const result = await supabaseDb.getUpdatedTaskLists('test-user-id', '2024-01-01T00:00:00Z');

      expect(result).toHaveLength(1);
      expect(mockGt).toHaveBeenCalledWith('updated_at', '2024-01-01T00:00:00Z');
    });
  });

  describe('用户数据管理', () => {
    it('应该检查用户数据是否存在', async () => {
      mockEq.mockReturnValueOnce({
        count: 5,
        error: null
      });

      const result = await supabaseDb.getUserDataExists('test-user-id');

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('应该返回用户数据不存在', async () => {
      mockEq.mockReturnValueOnce({
        count: 0,
        error: null
      });

      const result = await supabaseDb.getUserDataExists('test-user-id');

      expect(result).toBe(false);
    });
  });
});