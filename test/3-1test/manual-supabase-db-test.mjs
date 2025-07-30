/**
 * Supabase 数据层手动测试
 * 运行方式: node test/3-1test/manual-supabase-db-test.mjs
 * 
 * 注意：这个测试需要真实的 Supabase 环境变量
 */

import * as supabaseDb from '../../src/lib/supabase-db.js';

// 模拟环境变量（如果未设置）
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  console.log('⚠️  使用模拟的 Supabase 环境变量');
}

console.log('=== Supabase 数据层手动测试 ===\n');

// 测试1: 检查导出的函数
console.log('1. 检查导出的函数');
const exportedFunctions = [
  'getSupabaseTasks',
  'addSupabaseTask',
  'updateSupabaseTask',
  'deleteSupabaseTask',
  'moveSupabaseTask',
  'reorderSupabaseTasks',
  'getSupabaseTaskLists',
  'addSupabaseTaskList',
  'updateSupabaseTaskList',
  'deleteSupabaseTaskList',
  'setSupabaseActiveTaskList',
  'batchInsertTasks',
  'batchInsertTaskLists',
  'validateTaskListOwnership',
  'validateTaskOwnership',
  'getUserDataExists',
  'getUpdatedTasks',
  'getUpdatedTaskLists'
];

exportedFunctions.forEach(funcName => {
  const hasFunction = typeof supabaseDb[funcName] === 'function';
  console.log(`- ${funcName}: ${hasFunction ? '✅' : '❌'}`);
});
console.log('');

// 测试2: 数据格式转换
console.log('2. 测试数据格式（通过模拟转换器）');
try {
  // 测试任务数据结构
  const testTask = {
    id: 'test-task-1',
    text: '测试任务',
    completed: 0,
    deleted: 0,
    quadrant: 1,
    listId: 'test-list-1',
    estimatedTime: '2小时',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('测试任务数据结构:');
  console.log(JSON.stringify(testTask, null, 2));
  
  // 测试任务列表数据结构
  const testTaskList = {
    id: 'test-list-1',
    name: '测试列表',
    isActive: 1,
    deleted: 0,
    layoutMode: 'FOUR',
    showETA: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('\n测试任务列表数据结构:');
  console.log(JSON.stringify(testTaskList, null, 2));
  
} catch (error) {
  console.error('数据格式测试失败:', error);
}
console.log('');

// 测试3: 错误类型
console.log('3. 测试错误处理类型');
const errorScenarios = [
  { name: '未认证错误', error: new Error('User not authenticated') },
  { name: '验证错误', error: new Error('Access denied') },
  { name: '未找到错误', error: new Error('Task list not found') },
  { name: '数据库错误', error: new Error('Database error') }
];

errorScenarios.forEach(({ name, error }) => {
  console.log(`- ${name}: ${error.message}`);
});
console.log('');

// 测试4: 函数签名验证
console.log('4. 验证主要函数签名');
try {
  // 获取函数参数长度
  console.log(`- getSupabaseTasks: ${supabaseDb.getSupabaseTasks.length} 参数`);
  console.log(`- addSupabaseTask: ${supabaseDb.addSupabaseTask.length} 参数`);
  console.log(`- updateSupabaseTask: ${supabaseDb.updateSupabaseTask.length} 参数`);
  console.log(`- deleteSupabaseTask: ${supabaseDb.deleteSupabaseTask.length} 参数`);
  console.log(`- addSupabaseTaskList: ${supabaseDb.addSupabaseTaskList.length} 参数`);
  console.log(`- batchInsertTasks: ${supabaseDb.batchInsertTasks.length} 参数`);
} catch (error) {
  console.error('函数签名验证失败:', error);
}
console.log('');

// 测试5: 同步功能相关
console.log('5. 同步功能相关测试');
try {
  // 验证同步相关函数存在
  const syncFunctions = ['getUpdatedTasks', 'getUpdatedTaskLists'];
  syncFunctions.forEach(func => {
    console.log(`- ${func}: ${typeof supabaseDb[func] === 'function' ? '已实现' : '未实现'}`);
  });
  
  // 测试同步时间参数
  const testSyncTime = '2024-01-01T00:00:00Z';
  console.log(`- 测试同步时间格式: ${testSyncTime}`);
} catch (error) {
  console.error('同步功能测试失败:', error);
}
console.log('');

// 测试6: 默认导出
console.log('6. 验证默认导出');
const defaultExport = supabaseDb.default;
if (defaultExport) {
  console.log('默认导出包含的方法:');
  Object.keys(defaultExport).forEach(key => {
    console.log(`- ${key}: ${typeof defaultExport[key]}`);
  });
} else {
  console.log('❌ 没有找到默认导出');
}

console.log('\n=== 测试完成 ===');
console.log('注意: 这是一个基础功能测试，不涉及实际的数据库操作。');
console.log('实际的数据库操作需要有效的 Supabase 配置和认证。');