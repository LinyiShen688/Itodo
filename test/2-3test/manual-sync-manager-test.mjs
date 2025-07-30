/**
 * SyncManager 手动测试
 * 运行方式: node test/2-3test/manual-sync-manager-test.mjs
 */

import * as syncManager from '../../src/lib/sync-manager.js';

console.log('=== SyncManager 手动测试 ===\n');

// 测试1: 状态管理
console.log('1. 测试状态管理');
console.log('初始处理状态:', syncManager.getProcessing());
syncManager.setProcessing(true);
console.log('设置为 true 后:', syncManager.getProcessing());
syncManager.setProcessing(false);
console.log('设置为 false 后:', syncManager.getProcessing());
console.log('');

// 测试2: 同步操作
console.log('2. 测试同步操作');
try {
  // 测试任务同步
  console.log('- 测试任务同步...');
  const taskResult = await syncManager.syncTask('add', 'task-123', {
    text: '测试任务',
    completed: 0,
    quadrant: 1
  });
  console.log('任务同步结果:', taskResult);

  // 测试任务列表同步
  console.log('\n- 测试任务列表同步...');
  const listResult = await syncManager.syncTaskList('update', 'list-456', {
    name: '工作清单',
    isActive: 1
  });
  console.log('任务列表同步结果:', listResult);

  // 测试统一同步入口
  console.log('\n- 测试统一同步入口...');
  const unifiedResult = await syncManager.sync('delete', 'task', 'task-789', {});
  console.log('统一同步结果:', unifiedResult);
} catch (error) {
  console.error('同步操作出错:', error);
}
console.log('');

// 测试3: 错误分类
console.log('3. 测试错误分类');
const testErrors = [
  { name: '网络错误', error: { code: 'NETWORK_ERROR' } },
  { name: '认证错误', error: { status: 401 } },
  { name: '验证错误', error: { status: 400 } },
  { name: '服务器错误', error: { status: 500 } },
  { name: '未知错误', error: { message: 'unknown error' } }
];

testErrors.forEach(({ name, error }) => {
  const isRetryable = syncManager.isRetryableError(error);
  const errorType = syncManager.classifyError(error);
  console.log(`- ${name}: 可重试=${isRetryable}, 类型=${errorType}`);
});
console.log('');

// 测试4: 网络监听
console.log('4. 测试网络监听');

// 创建测试回调
let callbackCount = 0;
const testCallback = () => {
  callbackCount++;
  console.log(`网络恢复回调被执行 (第 ${callbackCount} 次)`);
};

// 注册回调
syncManager.onNetworkRestore(testCallback);
console.log('- 已注册网络恢复回调');

// 初始化网络监听
syncManager.initNetworkListener();
console.log('- 网络监听器已初始化');

// 检查网络状态
console.log('- 当前网络状态:', syncManager.isOnline() ? '在线' : '离线');

// 模拟网络恢复事件
console.log('\n- 模拟网络恢复事件...');
if (typeof window !== 'undefined') {
  window.dispatchEvent(new Event('online'));
} else {
  console.log('  (注意: 在 Node.js 环境中无法模拟浏览器事件)');
}

// 移除回调
syncManager.offNetworkRestore(testCallback);
console.log('\n- 已移除网络恢复回调');

// 销毁监听器
syncManager.destroyNetworkListener();
console.log('- 网络监听器已销毁');
console.log('');

// 测试5: 错误类型常量
console.log('5. 错误类型常量');
console.log('可用的错误类型:', syncManager.ERROR_TYPES);
console.log('');

// 测试6: 边界情况
console.log('6. 测试边界情况');
try {
  // 测试空对象
  const emptyResult = await syncManager.syncTask('update', 'test-id', {});
  console.log('- 空对象同步结果:', emptyResult);

  // 测试 null entityId
  const nullResult = await syncManager.syncTask('add', null, { text: 'test' });
  console.log('- null entityId 同步结果:', nullResult);

  // 测试未知实体类型
  try {
    await syncManager.sync('add', 'unknown', 'id', {});
  } catch (error) {
    console.log('- 未知实体类型错误 (预期行为):', error.message);
  }
} catch (error) {
  console.error('边界情况测试出错:', error);
}

console.log('\n=== 测试完成 ===');