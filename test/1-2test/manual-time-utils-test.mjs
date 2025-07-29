/**
 * 时区处理函数手动测试脚本
 * 
 * 运行方法：
 * node test/1-2test/manual-time-utils-test.mjs
 * 
 * 这个脚本将演示所有时区处理函数的核心功能
 */

import {
  nowUTC,
  toUTCMillis,
  normalizeToUTC,
  compareTimestamps,
  toISOString,
  isValidTimestamp,
  withUpdatedTimestamp,
  withTimestamps
} from '../../src/lib/time-utils.js';

console.log('=== 时区处理工具函数手动测试 ===\n');

// 1. 测试 nowUTC()
console.log('1. nowUTC() - 创建当前UTC时间');
const now = nowUTC();
console.log(`当前UTC时间: ${now}`);
console.log(`是否为Date对象: ${now instanceof Date}`);
console.log('');

// 2. 测试不同时区的时间戳转换
console.log('2. 时区统一处理测试');
const testCases = [
  new Date('2024-01-15T10:30:00Z'),           // UTC时间
  '2024-01-15T18:30:00+08:00',                // 北京时间 (UTC+8)
  '2024-01-15T05:30:00-05:00',                // 纽约时间 (UTC-5)
  '2024-01-15T10:30:00.000Z',                 // 带毫秒的UTC
  1705316200000                                // 毫秒时间戳
];

console.log('原始时间表示 → UTC毫秒数');
testCases.forEach((testCase, index) => {
  try {
    const utcMillis = toUTCMillis(testCase);
    console.log(`${index + 1}. ${testCase} → ${utcMillis}`);
  } catch (error) {
    console.log(`${index + 1}. ${testCase} → 错误: ${error.message}`);
  }
});

// 验证所有表示的是同一时刻
const utcMillisResults = testCases.map(tc => {
  try {
    return toUTCMillis(tc);
  } catch {
    return null;
  }
}).filter(r => r !== null);

const allSame = utcMillisResults.every(millis => millis === utcMillisResults[0]);
console.log(`\n✓ 所有时间表示都是同一时刻: ${allSame ? '是' : '否'}`);
console.log('');

// 3. 测试时间戳比较
console.log('3. 时间戳比较测试');
const earlier = '2024-01-15T10:00:00Z';
const later = '2024-01-15T11:00:00+01:00';  // 实际上是同一时刻！
const muchLater = '2024-01-15T12:00:00Z';

console.log(`比较: ${earlier} vs ${later}`);
const compare1 = compareTimestamps(earlier, later);
console.log(`结果: ${compare1} (${compare1 === 0 ? '相同时刻' : compare1 > 0 ? '前者更晚' : '后者更晚'})`);

console.log(`比较: ${earlier} vs ${muchLater}`);
const compare2 = compareTimestamps(earlier, muchLater);
console.log(`结果: ${compare2} (${compare2 === 0 ? '相同时刻' : compare2 > 0 ? '前者更晚' : '后者更晚'})`);
console.log('');

// 4. 测试 ISO 字符串格式化
console.log('4. ISO字符串格式化测试');
const testDate = new Date('2024-01-15T10:30:45.123Z');
console.log(`Date对象: ${testDate}`);
console.log(`ISO字符串: ${toISOString(testDate)}`);
console.log(`毫秒时间戳转ISO: ${toISOString(testDate.getTime())}`);
console.log('');

// 5. 测试时间戳有效性检查
console.log('5. 时间戳有效性测试');
const validTests = [
  new Date(),
  '2024-01-15T10:30:00Z',
  Date.now(),
  1705316200000
];
const invalidTests = [
  null,
  undefined,
  'invalid-date',
  {},
  NaN,
  -1
];

console.log('有效时间戳:');
validTests.forEach((test, i) => {
  console.log(`  ${i + 1}. ${test} → ${isValidTimestamp(test) ? '✓ 有效' : '✗ 无效'}`);
});

console.log('无效时间戳:');
invalidTests.forEach((test, i) => {
  console.log(`  ${i + 1}. ${test} → ${isValidTimestamp(test) ? '✓ 有效' : '✗ 无效'}`);
});
console.log('');

// 6. 测试添加时间戳功能
console.log('6. 添加时间戳功能测试');
const taskData = { id: 'task-123', text: '测试任务', completed: false };

console.log('原始任务数据:');
console.log(JSON.stringify(taskData, null, 2));

const withUpdated = withUpdatedTimestamp(taskData);
console.log('\n添加 updatedAt 后:');
console.log(JSON.stringify({
  ...withUpdated,
  updatedAt: withUpdated.updatedAt.toISOString()
}, null, 2));

const withBoth = withTimestamps(taskData);
console.log('\n添加 createdAt 和 updatedAt 后:');
console.log(JSON.stringify({
  ...withBoth,
  createdAt: withBoth.createdAt.toISOString(),
  updatedAt: withBoth.updatedAt.toISOString()
}, null, 2));

const timeDiff = Math.abs(withBoth.createdAt.getTime() - withBoth.updatedAt.getTime());
console.log(`\ncratedAt 和 updatedAt 时间差: ${timeDiff}ms (应该为0或很小)`);
console.log('');

// 7. 性能测试
console.log('7. 性能测试');
const iterations = 1000;

// 测试转换性能
const perfStart1 = performance.now();
for (let i = 0; i < iterations; i++) {
  toUTCMillis(new Date());
}
const perfEnd1 = performance.now();
console.log(`${iterations}次时间戳转换耗时: ${(perfEnd1 - perfStart1).toFixed(2)}ms`);

// 测试比较性能
const date1 = new Date('2024-01-15T10:00:00Z');
const date2 = new Date('2024-01-15T11:00:00Z');
const perfStart2 = performance.now();
for (let i = 0; i < iterations; i++) {
  compareTimestamps(date1, date2);
}
const perfEnd2 = performance.now();
console.log(`${iterations}次时间戳比较耗时: ${(perfEnd2 - perfStart2).toFixed(2)}ms`);
console.log('');

// 8. 边界情况测试
console.log('8. 边界情况测试');
try {
  const veryEarly = new Date('1970-01-01T00:00:00Z');
  const veryLate = new Date('2099-12-31T23:59:59Z');
  
  console.log(`很早的日期: ${toISOString(veryEarly)}`);
  console.log(`很晚的日期: ${toISOString(veryLate)}`);
  console.log(`比较结果: ${compareTimestamps(veryLate, veryEarly) > 0 ? '后者更晚' : '前者更晚'}`);
} catch (error) {
  console.log(`边界情况错误: ${error.message}`);
}

console.log('\n=== 手动测试完成 ===');
console.log('\n如果看到以上所有输出都合理（没有异常错误），说明时区处理函数正常工作！');
console.log('\n关键验证点:');
console.log('1. 不同时区表示的同一时刻转换为相同的UTC毫秒数');
console.log('2. 时间戳比较结果符合逻辑');
console.log('3. 有效/无效时间戳识别正确');
console.log('4. 性能测试在合理范围内（<10ms）');
console.log('5. 没有抛出未处理的异常');