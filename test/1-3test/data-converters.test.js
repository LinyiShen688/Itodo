/**
 * 数据格式转换函数测试
 * 测试 IndexedDB 和 Supabase 之间的双向数据转换
 */

import {
  convertIndexedDBToSupabase,
  convertSupabaseToIndexedDB,
  batchConvertIndexedDBToSupabase,
  batchConvertSupabaseToIndexedDB,
  validateConversion,
  sampleData
} from '../../src/lib/data-converters.js';

describe('数据格式转换函数测试', () => {
  
  const TEST_USER_ID = 'test-user-123';

  describe('convertIndexedDBToSupabase()', () => {
    test('应该正确转换任务数据', () => {
      const indexedDBTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        text: '完成项目提案',
        completed: 1,
        deleted: 0,
        quadrant: 1,
        listId: '660e8400-e29b-41d4-a716-446655440001',
        estimatedTime: '2小时',
        order: 0,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T11:00:00Z')
      };

      const result = convertIndexedDBToSupabase(indexedDBTask, TEST_USER_ID);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: TEST_USER_ID,
        text: '完成项目提案',
        completed: true,                               // 1 → true
        deleted: 0,
        quadrant: 1,
        list_id: '660e8400-e29b-41d4-a716-446655440001', // listId → list_id
        estimated_time: '2小时',                        // estimatedTime → estimated_time
        order: 0,
        created_at: '2024-01-15T10:30:00.000Z',        // Date → ISO字符串
        updated_at: '2024-01-15T11:00:00.000Z'         // Date → ISO字符串
      });
    });

    test('应该正确转换任务列表数据', () => {
      const indexedDBTaskList = {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: '今天要做的事',
        isActive: 1,
        deleted: 0,
        layoutMode: 'FOUR',
        showETA: true,
        createdAt: new Date('2024-01-15T09:00:00Z'),
        updatedAt: new Date('2024-01-15T09:00:00Z')
      };

      const result = convertIndexedDBToSupabase(indexedDBTaskList, TEST_USER_ID);

      expect(result).toEqual({
        id: '660e8400-e29b-41d4-a716-446655440001',
        user_id: TEST_USER_ID,
        name: '今天要做的事',
        is_active: true,                              // 1 → true
        deleted: 0,
        layout_mode: 'FOUR',                          // layoutMode → layout_mode
        show_eta: true,                               // showETA → show_eta
        created_at: '2024-01-15T09:00:00.000Z',
        updated_at: '2024-01-15T09:00:00.000Z'
      });
    });

    test('应该处理默认值', () => {
      const minimalTask = {
        id: 'test-id',
        text: '测试任务',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z')
      };

      const result = convertIndexedDBToSupabase(minimalTask, TEST_USER_ID);

      expect(result.completed).toBe(false);           // undefined → false
      expect(result.deleted).toBe(0);                 // undefined → 0
      expect(result.estimated_time).toBe('');         // undefined → ''
      expect(result.order).toBe(0);                   // undefined → 0
    });

    test('应该处理任务列表默认值', () => {
      const minimalTaskList = {
        id: 'test-id',
        name: '测试列表',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z')
      };

      const result = convertIndexedDBToSupabase(minimalTaskList, TEST_USER_ID);

      expect(result.is_active).toBe(false);           // undefined → false
      expect(result.deleted).toBe(0);                 // undefined → 0
      expect(result.layout_mode).toBe('FOUR');        // undefined → 'FOUR'
      expect(result.show_eta).toBe(true);             // undefined → true
    });

    test('应该拒绝无效输入', () => {
      expect(() => convertIndexedDBToSupabase(null, TEST_USER_ID)).toThrow('Data and userId are required');
      expect(() => convertIndexedDBToSupabase({}, null)).toThrow('Data and userId are required');
      expect(() => convertIndexedDBToSupabase(null, null)).toThrow('Data and userId are required');
    });
  });

  describe('convertSupabaseToIndexedDB()', () => {
    test('应该正确转换任务数据', () => {
      const supabaseTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: TEST_USER_ID,
        text: '完成项目提案',
        completed: true,
        deleted: 0,
        quadrant: 1,
        list_id: '660e8400-e29b-41d4-a716-446655440001',
        estimated_time: '2小时',
        order: 0,
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T11:00:00.000Z'
      };

      const result = convertSupabaseToIndexedDB(supabaseTask);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        text: '完成项目提案',
        completed: 1,                                  // true → 1
        deleted: 0,
        quadrant: 1,
        listId: '660e8400-e29b-41d4-a716-446655440001', // list_id → listId
        estimatedTime: '2小时',                         // estimated_time → estimatedTime
        order: 0,
        createdAt: new Date('2024-01-15T10:30:00.000Z'), // ISO字符串 → Date
        updatedAt: new Date('2024-01-15T11:00:00.000Z')  // ISO字符串 → Date
      });
    });

    test('应该正确转换任务列表数据', () => {
      const supabaseTaskList = {
        id: '660e8400-e29b-41d4-a716-446655440001',
        user_id: TEST_USER_ID,
        name: '今天要做的事',
        is_active: true,
        deleted: 0,
        layout_mode: 'FOUR',
        show_eta: true,
        created_at: '2024-01-15T09:00:00.000Z',
        updated_at: '2024-01-15T09:00:00.000Z'
      };

      const result = convertSupabaseToIndexedDB(supabaseTaskList);

      expect(result).toEqual({
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: '今天要做的事',
        isActive: 1,                                   // true → 1
        deleted: 0,
        layoutMode: 'FOUR',                            // layout_mode → layoutMode
        showETA: true,                                 // show_eta → showETA
        createdAt: new Date('2024-01-15T09:00:00.000Z'),
        updatedAt: new Date('2024-01-15T09:00:00.000Z')
      });
    });

    test('应该处理布尔值转换', () => {
      const taskTrue = { text: '测试', completed: true, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' };
      const taskFalse = { text: '测试', completed: false, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' };

      expect(convertSupabaseToIndexedDB(taskTrue).completed).toBe(1);
      expect(convertSupabaseToIndexedDB(taskFalse).completed).toBe(0);

      const listTrue = { name: '测试', is_active: true, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' };
      const listFalse = { name: '测试', is_active: false, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' };

      expect(convertSupabaseToIndexedDB(listTrue).isActive).toBe(1);
      expect(convertSupabaseToIndexedDB(listFalse).isActive).toBe(0);
    });

    test('应该处理默认值', () => {
      const minimalTask = {
        id: 'test-id',
        text: '测试任务',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      const result = convertSupabaseToIndexedDB(minimalTask);

      expect(result.completed).toBe(0);               // undefined → 0
      expect(result.deleted).toBe(0);                 // undefined → 0
      expect(result.estimatedTime).toBe('');          // undefined → ''
      expect(result.order).toBe(0);                   // undefined → 0
    });

    test('应该拒绝无效输入', () => {
      expect(() => convertSupabaseToIndexedDB(null)).toThrow('Data is required');
      expect(() => convertSupabaseToIndexedDB(undefined)).toThrow('Data is required');
    });
  });

  describe('批量转换函数', () => {
    test('batchConvertIndexedDBToSupabase 应该正确批量转换', () => {
      const indexedDBData = [
        { id: '1', text: '任务1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: '列表1', createdAt: new Date(), updatedAt: new Date() }
      ];

      const result = batchConvertIndexedDBToSupabase(indexedDBData, TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe(TEST_USER_ID);
      expect(result[1].user_id).toBe(TEST_USER_ID);
      expect(result[0].text).toBe('任务1');
      expect(result[1].name).toBe('列表1');
    });

    test('batchConvertSupabaseToIndexedDB 应该正确批量转换', () => {
      const supabaseData = [
        { id: '1', text: '任务1', user_id: TEST_USER_ID, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' },
        { id: '2', name: '列表1', user_id: TEST_USER_ID, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' }
      ];

      const result = batchConvertSupabaseToIndexedDB(supabaseData);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('任务1');
      expect(result[1].name).toBe('列表1');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[1].createdAt).toBeInstanceOf(Date);
    });

    test('批量转换应该拒绝非数组输入', () => {
      expect(() => batchConvertIndexedDBToSupabase({}, TEST_USER_ID)).toThrow('Data must be an array');
      expect(() => batchConvertSupabaseToIndexedDB({})).toThrow('Data must be an array');
    });
  });

  describe('双向转换一致性测试', () => {
    test('任务数据双向转换应该保持一致', () => {
      const originalTask = sampleData.indexedDBTask;
      
      // IndexedDB → Supabase → IndexedDB
      const supabaseFormat = convertIndexedDBToSupabase(originalTask, TEST_USER_ID);
      const backToIndexedDB = convertSupabaseToIndexedDB(supabaseFormat);

      // 验证关键字段一致性
      expect(backToIndexedDB.id).toBe(originalTask.id);
      expect(backToIndexedDB.text).toBe(originalTask.text);
      expect(backToIndexedDB.completed).toBe(originalTask.completed);
      expect(backToIndexedDB.quadrant).toBe(originalTask.quadrant);
      expect(backToIndexedDB.listId).toBe(originalTask.listId);
      expect(backToIndexedDB.estimatedTime).toBe(originalTask.estimatedTime);
      expect(backToIndexedDB.order).toBe(originalTask.order);
      
      // 时间戳应该保持相同的时刻（可能精度不同）
      expect(backToIndexedDB.createdAt.getTime()).toBe(originalTask.createdAt.getTime());
      expect(backToIndexedDB.updatedAt.getTime()).toBe(originalTask.updatedAt.getTime());
    });

    test('任务列表数据双向转换应该保持一致', () => {
      const originalTaskList = sampleData.indexedDBTaskList;
      
      // IndexedDB → Supabase → IndexedDB
      const supabaseFormat = convertIndexedDBToSupabase(originalTaskList, TEST_USER_ID);
      const backToIndexedDB = convertSupabaseToIndexedDB(supabaseFormat);

      // 验证关键字段一致性
      expect(backToIndexedDB.id).toBe(originalTaskList.id);
      expect(backToIndexedDB.name).toBe(originalTaskList.name);
      expect(backToIndexedDB.isActive).toBe(originalTaskList.isActive);
      expect(backToIndexedDB.deleted).toBe(originalTaskList.deleted);
      expect(backToIndexedDB.layoutMode).toBe(originalTaskList.layoutMode);
      expect(backToIndexedDB.showETA).toBe(originalTaskList.showETA);
      
      // 时间戳应该保持相同的时刻
      expect(backToIndexedDB.createdAt.getTime()).toBe(originalTaskList.createdAt.getTime());
      expect(backToIndexedDB.updatedAt.getTime()).toBe(originalTaskList.updatedAt.getTime());
    });
  });

  describe('validateConversion()', () => {
    test('应该验证正确的 IndexedDB → Supabase 转换', () => {
      const original = sampleData.indexedDBTask;
      const converted = convertIndexedDBToSupabase(original, TEST_USER_ID);
      
      expect(validateConversion(original, converted, 'toSupabase')).toBe(true);
    });

    test('应该验证正确的 Supabase → IndexedDB 转换', () => {
      const original = sampleData.supabaseTask;
      const converted = convertSupabaseToIndexedDB(original);
      
      expect(validateConversion(original, converted, 'toIndexedDB')).toBe(true);
    });

    test('应该拒绝不正确的转换', () => {
      const original = sampleData.indexedDBTask;
      const wrongConverted = { ...convertIndexedDBToSupabase(original, TEST_USER_ID), id: 'wrong-id' };
      
      expect(validateConversion(original, wrongConverted, 'toSupabase')).toBe(false);
    });

    test('应该处理无效输入', () => {
      expect(validateConversion(null, {}, 'toSupabase')).toBe(false);
      expect(validateConversion({}, null, 'toSupabase')).toBe(false);
      expect(validateConversion({}, {}, 'invalidDirection')).toBe(false);
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理空字符串字段', () => {
      const taskWithEmptyFields = {
        id: 'test',
        text: '',
        estimatedTime: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = convertIndexedDBToSupabase(taskWithEmptyFields, TEST_USER_ID);
      expect(result.text).toBe('');
      expect(result.estimated_time).toBe('');
    });

    test('应该处理删除状态的各种值', () => {
      const testCases = [
        { deleted: 0, expected: 0 },
        { deleted: 1, expected: 1 },
        { deleted: 2, expected: 2 },
        { deleted: undefined, expected: 0 }
      ];

      testCases.forEach(({ deleted, expected }) => {
        const task = {
          text: '测试',
          deleted,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = convertIndexedDBToSupabase(task, TEST_USER_ID);
        expect(result.deleted).toBe(expected);
      });
    });

    test('应该处理showETA的特殊逻辑', () => {
      const testCases = [
        { showETA: true, expected: true },
        { showETA: false, expected: false },
        { showETA: undefined, expected: true },  // 默认为true
        { show_eta: true, expected: true },
        { show_eta: false, expected: false },
        { show_eta: undefined, expected: true }   // 默认为true
      ];

      testCases.forEach(({ showETA, show_eta, expected }) => {
        if (showETA !== undefined) {
          // 测试 IndexedDB → Supabase
          const taskList = {
            name: '测试',
            showETA,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const result = convertIndexedDBToSupabase(taskList, TEST_USER_ID);
          expect(result.show_eta).toBe(expected);
        }
        
        if (show_eta !== undefined) {
          // 测试 Supabase → IndexedDB
          const taskList = {
            name: '测试',
            show_eta,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          };
          const result = convertSupabaseToIndexedDB(taskList);
          expect(result.showETA).toBe(expected);
        }
      });
    });
  });

  describe('示例数据验证', () => {
    test('sampleData 应该包含所有必要的示例', () => {
      expect(sampleData.indexedDBTask).toBeDefined();
      expect(sampleData.indexedDBTaskList).toBeDefined();
      expect(sampleData.supabaseTask).toBeDefined();
      expect(sampleData.supabaseTaskList).toBeDefined();
      
      // 验证示例数据的正确性
      expect(sampleData.indexedDBTask.text).toBeDefined();
      expect(sampleData.indexedDBTaskList.name).toBeDefined();
      expect(sampleData.supabaseTask.text).toBeDefined();
      expect(sampleData.supabaseTaskList.name).toBeDefined();
    });

    test('示例数据应该可以正确转换', () => {
      // 测试 IndexedDB 示例数据转换
      expect(() => convertIndexedDBToSupabase(sampleData.indexedDBTask, TEST_USER_ID)).not.toThrow();
      expect(() => convertIndexedDBToSupabase(sampleData.indexedDBTaskList, TEST_USER_ID)).not.toThrow();
      
      // 测试 Supabase 示例数据转换
      expect(() => convertSupabaseToIndexedDB(sampleData.supabaseTask)).not.toThrow();
      expect(() => convertSupabaseToIndexedDB(sampleData.supabaseTaskList)).not.toThrow();
    });
  });

  describe('性能测试', () => {
    test('大批量转换应该快速完成', () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        text: `任务 ${i}`,
        completed: i % 2,
        quadrant: (i % 4) + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const start = performance.now();
      const result = batchConvertIndexedDBToSupabase(largeDataSet, TEST_USER_ID);
      const end = performance.now();

      expect(result).toHaveLength(1000);
      // 1000条数据转换应该在100ms内完成
      expect(end - start).toBeLessThan(100);
    });
  });
});