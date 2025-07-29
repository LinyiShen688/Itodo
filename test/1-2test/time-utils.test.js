/**
 * 时区处理工具函数测试
 * 测试所有时区处理函数的正确性和边界情况
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

describe('时区处理工具函数测试', () => {
  
  describe('nowUTC()', () => {
    test('应该返回Date对象', () => {
      const result = nowUTC();
      expect(result).toBeInstanceOf(Date);
    });
    
    test('应该返回当前时间（误差在1秒内）', () => {
      const before = Date.now();
      const result = nowUTC();
      const after = Date.now();
      
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('toUTCMillis()', () => {
    const testDate = new Date('2024-01-15T10:30:00Z'); // UTC时间
    const testMillis = testDate.getTime();
    const testISOString = testDate.toISOString();

    test('应该正确处理Date对象', () => {
      expect(toUTCMillis(testDate)).toBe(testMillis);
    });

    test('应该正确处理ISO字符串', () => {
      expect(toUTCMillis(testISOString)).toBe(testMillis);
    });

    test('应该正确处理毫秒时间戳', () => {
      expect(toUTCMillis(testMillis)).toBe(testMillis);
    });

    test('应该处理不同时区的ISO字符串', () => {
      const utcString = '2024-01-15T10:30:00Z';
      const plusEightString = '2024-01-15T18:30:00+08:00'; // 北京时间
      const minusFiveString = '2024-01-15T05:30:00-05:00'; // 纽约时间
      
      const utcMillis = toUTCMillis(utcString);
      const plusEightMillis = toUTCMillis(plusEightString);
      const minusFiveMillis = toUTCMillis(minusFiveString);
      
      // 所有时间戳应该相等（都是同一时刻）
      expect(utcMillis).toBe(plusEightMillis);
      expect(utcMillis).toBe(minusFiveMillis);
    });

    test('应该拒绝无效输入', () => {
      expect(() => toUTCMillis(null)).toThrow('Invalid timestamp format');
      expect(() => toUTCMillis(undefined)).toThrow('Invalid timestamp format');
      expect(() => toUTCMillis({})).toThrow('Invalid timestamp format');
      expect(() => toUTCMillis('invalid-date')).toThrow('Invalid timestamp format');
    });
  });

  describe('normalizeToUTC()', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const testMillis = testDate.getTime();
    const testISOString = testDate.toISOString();

    test('应该正确处理Date对象', () => {
      expect(normalizeToUTC(testDate)).toBe(testMillis);
    });

    test('应该正确处理ISO字符串', () => {
      expect(normalizeToUTC(testISOString)).toBe(testMillis);
    });

    test('应该正确处理毫秒时间戳', () => {
      expect(normalizeToUTC(testMillis)).toBe(testMillis);
    });

    test('应该拒绝无效输入', () => {
      expect(() => normalizeToUTC(null)).toThrow('Invalid timestamp format');
      expect(() => normalizeToUTC(undefined)).toThrow('Invalid timestamp format');
    });
  });

  describe('compareTimestamps()', () => {
    const earlierDate = new Date('2024-01-15T10:00:00Z');
    const laterDate = new Date('2024-01-15T11:00:00Z');
    const sameDate = new Date('2024-01-15T10:00:00Z');

    test('应该正确比较不同时间', () => {
      expect(compareTimestamps(laterDate, earlierDate)).toBeGreaterThan(0);
      expect(compareTimestamps(earlierDate, laterDate)).toBeLessThan(0);
      expect(compareTimestamps(earlierDate, sameDate)).toBe(0);
    });

    test('应该处理混合格式输入', () => {
      const dateObj = new Date('2024-01-15T10:00:00Z');
      const isoString = '2024-01-15T10:00:00Z';
      const millis = dateObj.getTime();
      
      expect(compareTimestamps(dateObj, isoString)).toBe(0);
      expect(compareTimestamps(isoString, millis)).toBe(0);
      expect(compareTimestamps(dateObj, millis)).toBe(0);
    });

    test('应该处理不同时区的相同时刻', () => {
      const utc = '2024-01-15T10:00:00Z';
      const beijing = '2024-01-15T18:00:00+08:00';
      const newYork = '2024-01-15T05:00:00-05:00';
      
      expect(compareTimestamps(utc, beijing)).toBe(0);
      expect(compareTimestamps(beijing, newYork)).toBe(0);
      expect(compareTimestamps(utc, newYork)).toBe(0);
    });
  });

  describe('toISOString()', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const expectedISO = '2024-01-15T10:30:00.000Z';

    test('应该正确处理Date对象', () => {
      expect(toISOString(testDate)).toBe(expectedISO);
    });

    test('应该正确处理ISO字符串', () => {
      const inputISO = '2024-01-15T10:30:00Z';
      expect(toISOString(inputISO)).toBe(expectedISO);
    });

    test('应该正确处理毫秒时间戳', () => {
      expect(toISOString(testDate.getTime())).toBe(expectedISO);
    });

    test('应该拒绝无效输入', () => {
      expect(() => toISOString(null)).toThrow('Invalid timestamp format');
      expect(() => toISOString('invalid')).toThrow('Invalid timestamp format');
    });
  });

  describe('isValidTimestamp()', () => {
    test('应该识别有效时间戳', () => {
      const validDate = new Date('2024-01-15T10:30:00Z');
      const validISO = '2024-01-15T10:30:00Z';
      const validMillis = Date.now();
      
      expect(isValidTimestamp(validDate)).toBe(true);
      expect(isValidTimestamp(validISO)).toBe(true);
      expect(isValidTimestamp(validMillis)).toBe(true);
    });

    test('应该识别无效时间戳', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
      expect(isValidTimestamp('invalid-date')).toBe(false);
      expect(isValidTimestamp({})).toBe(false);
      expect(isValidTimestamp(NaN)).toBe(false);
      expect(isValidTimestamp(-1)).toBe(false);
      expect(isValidTimestamp(0)).toBe(false);
    });
  });

  describe('withUpdatedTimestamp()', () => {
    test('应该添加updatedAt字段', () => {
      const data = { id: '123', text: 'test task' };
      const result = withUpdatedTimestamp(data);
      
      expect(result).toHaveProperty('id', '123');
      expect(result).toHaveProperty('text', 'test task');
      expect(result).toHaveProperty('updatedAt');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test('应该覆盖已有的updatedAt字段', () => {
      const oldDate = new Date('2024-01-01T00:00:00Z');
      const data = { id: '123', updatedAt: oldDate };
      const result = withUpdatedTimestamp(data);
      
      expect(result.updatedAt).not.toBe(oldDate);
      expect(result.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    test('updatedAt应该是当前时间', () => {
      const before = Date.now();
      const result = withUpdatedTimestamp({ id: '123' });
      const after = Date.now();
      
      const updatedTime = result.updatedAt.getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(before);
      expect(updatedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('withTimestamps()', () => {
    test('应该添加createdAt和updatedAt字段', () => {
      const data = { id: '123', text: 'test task' };
      const result = withTimestamps(data);
      
      expect(result).toHaveProperty('id', '123');
      expect(result).toHaveProperty('text', 'test task');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test('createdAt和updatedAt应该相同', () => {
      const result = withTimestamps({ id: '123' });
      expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());
    });

    test('应该覆盖已有的时间戳字段', () => {
      const oldDate = new Date('2024-01-01T00:00:00Z');
      const data = { 
        id: '123', 
        createdAt: oldDate, 
        updatedAt: oldDate 
      };
      const result = withTimestamps(data);
      
      expect(result.createdAt).not.toBe(oldDate);
      expect(result.updatedAt).not.toBe(oldDate);
      expect(result.createdAt.getTime()).toBeGreaterThan(oldDate.getTime());
      expect(result.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    test('时间戳应该是当前时间', () => {
      const before = Date.now();
      const result = withTimestamps({ id: '123' });
      const after = Date.now();
      
      const createdTime = result.createdAt.getTime();
      const updatedTime = result.updatedAt.getTime();
      
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
      expect(updatedTime).toBeGreaterThanOrEqual(before);
      expect(updatedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理极端日期值', () => {
      const veryEarly = new Date('1970-01-01T00:00:00Z');
      const veryLate = new Date('2099-12-31T23:59:59Z');
      
      expect(() => toUTCMillis(veryEarly)).not.toThrow();
      expect(() => toUTCMillis(veryLate)).not.toThrow();
      expect(compareTimestamps(veryLate, veryEarly)).toBeGreaterThan(0);
    });

    test('应该处理毫秒精度', () => {
      const date1 = new Date('2024-01-15T10:30:00.000Z');
      const date2 = new Date('2024-01-15T10:30:00.001Z');
      
      expect(compareTimestamps(date2, date1)).toBe(1);
      expect(compareTimestamps(date1, date2)).toBe(-1);
    });

    test('应该处理不同ISO格式', () => {
      const formats = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15T10:30:00+00:00',
        '2024-01-15T18:30:00+08:00'
      ];
      
      const results = formats.map(toUTCMillis);
      
      // 前三个应该相等，第四个（北京时间）也应该等于前三个
      expect(results[0]).toBe(results[1]);
      expect(results[0]).toBe(results[2]);
      expect(results[0]).toBe(results[3]);
    });
  });

  describe('性能测试', () => {
    test('批量处理时间戳应该快速完成', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => 
        new Date(Date.now() + i * 1000)
      );
      
      const start = performance.now();
      dates.forEach(date => toUTCMillis(date));
      const end = performance.now();
      
      // 1000次转换应该在10ms内完成
      expect(end - start).toBeLessThan(10);
    });

    test('批量比较时间戳应该快速完成', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T11:00:00Z');
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        compareTimestamps(date1, date2);
      }
      const end = performance.now();
      
      // 1000次比较应该在5ms内完成
      expect(end - start).toBeLessThan(5);
    });
  });
});