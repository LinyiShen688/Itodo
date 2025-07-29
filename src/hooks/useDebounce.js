'use client';

import { useCallback, useRef } from 'react';

/**
 * 防抖 Hook
 * @param {Function} callback - 要防抖的函数
 * @param {number} delay - 防抖延迟时间（毫秒）
 * @param {Array} deps - 依赖数组，影响 callback 的重新创建
 * @returns {Function} 防抖后的函数
 */
export function useDebounce(callback, delay, deps = []) {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * 立即执行防抖 Hook
 * 第一次调用立即执行，后续调用会被防抖
 * @param {Function} callback - 要防抖的函数
 * @param {number} delay - 防抖延迟时间（毫秒）
 * @param {Array} deps - 依赖数组
 * @returns {Function} 防抖后的函数
 */
export function useDebounceLeading(callback, delay, deps = []) {
  const timeoutRef = useRef(null);
  const lastCallTimeRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    
    // 如果是第一次调用或距离上次调用已经超过延迟时间，立即执行
    if (now - lastCallTimeRef.current >= delay) {
      lastCallTimeRef.current = now;
      callback(...args);
      return;
    }

    // 否则使用防抖
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      lastCallTimeRef.current = Date.now();
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * 节流 Hook
 * @param {Function} callback - 要节流的函数
 * @param {number} delay - 节流间隔时间（毫秒）
 * @param {Array} deps - 依赖数组
 * @returns {Function} 节流后的函数
 */
export function useThrottle(callback, delay, deps = []) {
  const lastCallTimeRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastCallTimeRef.current >= delay) {
      lastCallTimeRef.current = now;
      callback(...args);
    }
  }, [callback, delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}