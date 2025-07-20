'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * 虚拟化列表 Hook
 * 适用于大量任务的渲染优化
 */
export function useVirtualization(items, options = {}) {
  const {
    initialLimit = 20,
    batchSize = 10,
    bufferSize = 5 // 额外渲染的项目数，用于平滑滚动
  } = options;

  const [visibleLimit, setVisibleLimit] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(false);

  // 可见项目列表
  const visibleItems = useMemo(() => {
    return items.slice(0, visibleLimit + bufferSize);
  }, [items, visibleLimit, bufferSize]);

  // 是否有更多项目
  const hasMore = visibleLimit < items.length;

  // 加载更多项目
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // 模拟异步加载（可以在这里添加实际的数据获取逻辑）
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setVisibleLimit(prev => Math.min(prev + batchSize, items.length));
    setIsLoading(false);
  }, [isLoading, hasMore, batchSize, items.length]);

  // 重置虚拟化状态（当数据源改变时）
  const reset = useCallback(() => {
    setVisibleLimit(initialLimit);
    setIsLoading(false);
  }, [initialLimit]);

  // 当 items 长度变化时，自动调整可见限制
  useEffect(() => {
    if (items.length < visibleLimit) {
      setVisibleLimit(items.length);
    }
  }, [items.length, visibleLimit]);

  return {
    visibleItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    totalCount: items.length,
    visibleCount: visibleItems.length
  };
}

/**
 * 分页 Hook
 * 适用于需要分页显示的场景
 */
export function usePagination(items, pageSize = 20) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}