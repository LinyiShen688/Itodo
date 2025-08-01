/**
 * 数据格式转换工具函数
 * 
 * 用于 IndexedDB 和 Supabase 之间的数据格式转换
 * 处理字段命名差异、数据类型转换、时间戳格式化等
 */

import { toISOString } from './time-utils.js';

/**
 * 将 IndexedDB 格式数据转换为 Supabase 格式
 * 
 * @param {Object} data - IndexedDB 格式的数据（任务或任务列表）
 * @param {string} userId - 用户ID，用于添加 user_id 字段
 * @returns {Object} Supabase 格式的数据
 */
export function convertIndexedDBToSupabase(data, userId) {
  if (!data || !userId) {
    throw new Error('Data and userId are required');
  }

  // 检测是任务还是任务列表（通过 text 字段判断）
  if (data.text !== undefined) {
    // 任务数据转换
    return {
      id: data.id,
      user_id: userId,
      text: data.text,
      completed: data.completed === 1,           // 0/1 → boolean
      deleted: data.deleted || 0,                // 保持数值类型，默认为0
      quadrant: data.quadrant,
      list_id: data.listId,                      // 驼峰 → 下划线
      estimated_time: data.estimatedTime || '',  // 驼峰 → 下划线，默认空字符串
      order: data.order || 0,                    // 默认为0
      created_at: toISOString(data.createdAt),   // Date → ISO字符串
      updated_at: toISOString(data.updatedAt)    // Date → ISO字符串
    };
  } else {
    // 任务列表数据转换
    return {
      id: data.id,
      user_id: userId,
      name: data.name,
      is_active: data.isActive === 1,            // 0/1 → boolean
      deleted: data.deleted || 0,                // 保持数值类型，默认为0
      layout_mode: data.layoutMode || 'FOUR',    // 驼峰 → 下划线，默认FOUR
      show_eta: data.showETA !== false,          // 默认true，只有明确false才为false
      created_at: toISOString(data.createdAt),   // Date → ISO字符串
      updated_at: toISOString(data.updatedAt)    // Date → ISO字符串
    };
  }
}

/**
 * 将 Supabase 格式数据转换为 IndexedDB 格式
 * 
 * @param {Object} data - Supabase 格式的数据（任务或任务列表）
 * @returns {Object} IndexedDB 格式的数据
 */
export function convertSupabaseToIndexedDB(data) {
  if (!data) {
    throw new Error('Data is required');
  }

  // 检测是任务还是任务列表（通过 text 字段判断）
  if (data.text !== undefined) {
    // 任务数据转换
    return {
      id: data.id,
      userId: data.user_id,                      // 保留 userId
      text: data.text,
      completed: data.completed ? 1 : 0,         // boolean → 0/1
      deleted: data.deleted || 0,                // 保留原值，默认为0
      quadrant: data.quadrant,
      listId: data.list_id,                      // 下划线 → 驼峰
      estimatedTime: data.estimated_time || '',  // 下划线 → 驼峰，默认空字符串
      order: data.order || 0,                    // 默认为0
      createdAt: new Date(data.created_at),      // ISO字符串 → Date
      updatedAt: new Date(data.updated_at)       // ISO字符串 → Date
    };
  } else {
    // 任务列表数据转换
    return {
      id: data.id,
      userId: data.user_id,                      // 保留 userId
      name: data.name,
      isActive: data.is_active ? 1 : 0,          // boolean → 0/1
      deleted: data.deleted || 0,                // 保留原值，默认为0
      layoutMode: data.layout_mode || 'FOUR',    // 下划线 → 驼峰，默认FOUR
      showETA: data.show_eta !== false,          // 默认true，只有明确false才为false
      createdAt: new Date(data.created_at),      // ISO字符串 → Date
      updatedAt: new Date(data.updated_at)       // ISO字符串 → Date
    };
  }
}

/**
 * 批量转换 IndexedDB 数据为 Supabase 格式
 * 
 * @param {Array} dataArray - IndexedDB 格式的数据数组
 * @param {string} userId - 用户ID
 * @returns {Array} Supabase 格式的数据数组
 */
export function batchConvertIndexedDBToSupabase(dataArray, userId) {
  if (!Array.isArray(dataArray)) {
    throw new Error('Data must be an array');
  }
  
  return dataArray.map(data => convertIndexedDBToSupabase(data, userId));
}

/**
 * 批量转换 Supabase 数据为 IndexedDB 格式
 * 
 * @param {Array} dataArray - Supabase 格式的数据数组
 * @returns {Array} IndexedDB 格式的数据数组
 */
export function batchConvertSupabaseToIndexedDB(dataArray) {
  if (!Array.isArray(dataArray)) {
    throw new Error('Data must be an array');
  }
  
  return dataArray.map(data => convertSupabaseToIndexedDB(data));
}

/**
 * 验证转换后的数据完整性
 * 
 * @param {Object} original - 原始数据
 * @param {Object} converted - 转换后的数据
 * @param {string} direction - 转换方向：'toSupabase' 或 'toIndexedDB'
 * @returns {boolean} 验证是否通过
 */
export function validateConversion(original, converted, direction) {
  if (!original || !converted) {
    return false;
  }

  try {
    if (direction === 'toSupabase') {
      // 验证 IndexedDB → Supabase 转换
      if (original.text !== undefined) {
        // 任务验证
        return (
          original.id === converted.id &&
          original.text === converted.text &&
          (original.completed === 1) === converted.completed &&
          original.quadrant === converted.quadrant &&
          original.listId === converted.list_id
        );
      } else {
        // 任务列表验证
        return (
          original.id === converted.id &&
          original.name === converted.name &&
          (original.isActive === 1) === converted.is_active &&
          original.layoutMode === converted.layout_mode
        );
      }
    } else if (direction === 'toIndexedDB') {
      // 验证 Supabase → IndexedDB 转换
      if (original.text !== undefined) {
        // 任务验证
        return (
          original.id === converted.id &&
          original.text === converted.text &&
          original.completed === (converted.completed === 1) &&
          original.quadrant === converted.quadrant &&
          original.list_id === converted.listId
        );
      } else {
        // 任务列表验证
        return (
          original.id === converted.id &&
          original.name === converted.name &&
          original.is_active === (converted.isActive === 1) &&
          original.layout_mode === converted.layoutMode
        );
      }
    }
    return false;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * 创建用于测试的示例数据
 */
export const sampleData = {
  // IndexedDB 格式的任务
  indexedDBTask: {
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
  },

  // IndexedDB 格式的任务列表
  indexedDBTaskList: {
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: '今天要做的事',
    isActive: 1,
    deleted: 0,
    layoutMode: 'FOUR',
    showETA: true,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T09:00:00Z')
  },

  // Supabase 格式的任务
  supabaseTask: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: 'user-123',
    text: '完成项目提案',
    completed: true,
    deleted: 0,
    quadrant: 1,
    list_id: '660e8400-e29b-41d4-a716-446655440001',
    estimated_time: '2小时',
    order: 0,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T11:00:00.000Z'
  },

  // Supabase 格式的任务列表
  supabaseTaskList: {
    id: '660e8400-e29b-41d4-a716-446655440001',
    user_id: 'user-123',
    name: '今天要做的事',
    is_active: true,
    deleted: 0,
    layout_mode: 'FOUR',
    show_eta: true,
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z'
  }
};