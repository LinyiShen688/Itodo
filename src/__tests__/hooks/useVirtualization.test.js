import { renderHook, act } from '@testing-library/react'
import { useVirtualization, usePagination } from '@/hooks/useVirtualization'

// Mock timers for loadMore simulation
jest.useFakeTimers()

describe('useVirtualization', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.clearAllTimers()
  })

  describe('基础虚拟化功能', () => {
    it('应该使用默认配置初始化', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items))

      expect(result.current.totalCount).toBe(50)
      expect(result.current.visibleCount).toBe(25) // initialLimit(20) + bufferSize(5)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('应该使用自定义配置初始化', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const options = {
        initialLimit: 30,
        batchSize: 15,
        bufferSize: 10
      }
      const { result } = renderHook(() => useVirtualization(items, options))

      expect(result.current.visibleCount).toBe(40) // initialLimit(30) + bufferSize(10)
      expect(result.current.hasMore).toBe(true)
    })

    it('应该正确计算可见项目', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items))

      const visibleItems = result.current.visibleItems
      expect(visibleItems).toHaveLength(10) // 少于 initialLimit + bufferSize
      expect(visibleItems[0]).toEqual({ id: 0, text: 'Task 0' })
      expect(visibleItems[9]).toEqual({ id: 9, text: 'Task 9' })
    })
  })

  describe('加载更多功能', () => {
    it('应该能加载更多项目', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 10, 
        batchSize: 5,
        bufferSize: 0 
      }))

      expect(result.current.visibleCount).toBe(10)
      expect(result.current.hasMore).toBe(true)

      act(() => {
        result.current.loadMore()
      })

      expect(result.current.isLoading).toBe(true)

      // 快进模拟的异步延迟
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.visibleCount).toBe(15) // 10 + 5
      expect(result.current.hasMore).toBe(true)
    })

    it('应该防止重复加载', async () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 10, 
        batchSize: 5,
        bufferSize: 0 
      }))

      // 连续调用 loadMore
      act(() => {
        result.current.loadMore()
        result.current.loadMore()
        result.current.loadMore()
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // 只应该执行一次加载
      expect(result.current.visibleCount).toBe(15)
      expect(result.current.isLoading).toBe(false)
    })

    it('应该在没有更多项目时停止加载', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 15,
        bufferSize: 0 
      }))

      expect(result.current.hasMore).toBe(false)

      act(() => {
        result.current.loadMore()
      })

      // 不应该进入加载状态
      expect(result.current.isLoading).toBe(false)
    })

    it('应该限制可见项目不超过总数', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 20, 
        batchSize: 10,
        bufferSize: 0 
      }))

      act(() => {
        result.current.loadMore()
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // 不应该超过总项目数
      expect(result.current.visibleCount).toBe(25)
      expect(result.current.hasMore).toBe(false)
    })
  })

  describe('重置功能', () => {
    it('应该能重置虚拟化状态', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 10,
        bufferSize: 0 
      }))

      // 先加载更多
      act(() => {
        result.current.loadMore()
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.visibleCount).toBe(20)

      // 重置
      act(() => {
        result.current.reset()
      })

      expect(result.current.visibleCount).toBe(10)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasMore).toBe(true)
    })
  })

  describe('响应式数据变化', () => {
    it('应该响应项目数组变化', () => {
      let items = Array.from({ length: 30 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => useVirtualization(items, { bufferSize: 0 }),
        { initialProps: { items } }
      )

      expect(result.current.totalCount).toBe(30)

      // 更新项目数组
      items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      rerender({ items })

      expect(result.current.totalCount).toBe(50)
      expect(result.current.hasMore).toBe(true)
    })

    it('应该在项目减少时自动调整可见限制', () => {
      let items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => useVirtualization(items, { 
          initialLimit: 30,
          bufferSize: 0 
        }),
        { initialProps: { items } }
      )

      expect(result.current.visibleCount).toBe(30)

      // 减少项目数到小于当前可见限制
      items = Array.from({ length: 10 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      rerender({ items })

      expect(result.current.visibleCount).toBe(10)
      expect(result.current.hasMore).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      const { result } = renderHook(() => useVirtualization([]))

      expect(result.current.totalCount).toBe(0)
      expect(result.current.visibleCount).toBe(0)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.visibleItems).toEqual([])
    })

    it('应该处理单个项目', () => {
      const items = [{ id: 1, text: 'Single Task' }]
      const { result } = renderHook(() => useVirtualization(items))

      expect(result.current.totalCount).toBe(1)
      expect(result.current.visibleCount).toBe(1)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.visibleItems).toEqual(items)
    })

    it('应该处理缓冲区大于数据的情况', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => useVirtualization(items, { 
        initialLimit: 3,
        bufferSize: 10 
      }))

      expect(result.current.visibleCount).toBe(5) // 不应该超过实际数据量
      expect(result.current.hasMore).toBe(false)
    })
  })
})

describe('usePagination', () => {
  describe('基础分页功能', () => {
    it('应该使用默认配置初始化', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items))

      expect(result.current.currentPage).toBe(1)
      expect(result.current.totalPages).toBe(3) // 50 / 20 = 2.5, 向上取整为 3
      expect(result.current.paginatedItems).toHaveLength(20)
      expect(result.current.hasNext).toBe(true)
      expect(result.current.hasPrev).toBe(false)
    })

    it('应该使用自定义页面大小', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      expect(result.current.totalPages).toBe(5) // 50 / 10 = 5
      expect(result.current.paginatedItems).toHaveLength(10)
    })

    it('应该正确计算分页项目', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      // 第一页
      expect(result.current.paginatedItems[0]).toEqual({ id: 0, text: 'Task 0' })
      expect(result.current.paginatedItems[9]).toEqual({ id: 9, text: 'Task 9' })

      // 跳转到第二页
      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(2)
      expect(result.current.paginatedItems[0]).toEqual({ id: 10, text: 'Task 10' })
      expect(result.current.paginatedItems[9]).toEqual({ id: 19, text: 'Task 19' })
    })
  })

  describe('页面导航', () => {
    it('应该能前进到下一页', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(2)
      expect(result.current.hasNext).toBe(true)
      expect(result.current.hasPrev).toBe(true)
    })

    it('应该能后退到上一页', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      // 先跳到第3页
      act(() => {
        result.current.goToPage(3)
      })

      expect(result.current.currentPage).toBe(3)

      // 返回上一页
      act(() => {
        result.current.prevPage()
      })

      expect(result.current.currentPage).toBe(2)
    })

    it('应该能跳转到指定页面', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      act(() => {
        result.current.goToPage(4)
      })

      expect(result.current.currentPage).toBe(4)
      expect(result.current.paginatedItems[0]).toEqual({ id: 30, text: 'Task 30' })
    })

    it('应该防止跳转到无效页面', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      // 尝试跳转到负数页面
      act(() => {
        result.current.goToPage(-1)
      })

      expect(result.current.currentPage).toBe(1)

      // 尝试跳转到超出范围的页面
      act(() => {
        result.current.goToPage(10)
      })

      expect(result.current.currentPage).toBe(5) // 最大页数
    })

    it('应该在第一页时无法后退', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      act(() => {
        result.current.prevPage()
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('应该在最后一页时无法前进', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      // 跳到最后一页
      act(() => {
        result.current.goToPage(5)
      })

      expect(result.current.hasNext).toBe(false)

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(5)
    })
  })

  describe('重置功能', () => {
    it('应该能重置到第一页', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      // 跳到第3页
      act(() => {
        result.current.goToPage(3)
      })

      expect(result.current.currentPage).toBe(3)

      // 重置
      act(() => {
        result.current.reset()
      })

      expect(result.current.currentPage).toBe(1)
    })
  })

  describe('响应式数据变化', () => {
    it('应该响应项目数组变化', () => {
      let items = Array.from({ length: 30 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, 10),
        { initialProps: { items } }
      )

      expect(result.current.totalPages).toBe(3)

      // 更新项目数组
      items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      rerender({ items })

      expect(result.current.totalPages).toBe(5)
    })

    it('应该在数据减少时自动调整当前页面', () => {
      let items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, 10),
        { initialProps: { items } }
      )

      // 跳到第5页
      act(() => {
        result.current.goToPage(5)
      })

      expect(result.current.currentPage).toBe(5)

      // 减少数据到只有2页
      items = Array.from({ length: 15 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      rerender({ items })

      expect(result.current.totalPages).toBe(2)
      // 当前页应该自动调整到有效范围内
      act(() => {
        result.current.goToPage(result.current.currentPage)
      })
      expect(result.current.currentPage).toBe(2)
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      const { result } = renderHook(() => usePagination([]))

      expect(result.current.totalPages).toBe(0)
      expect(result.current.paginatedItems).toEqual([])
      expect(result.current.hasNext).toBe(false)
      expect(result.current.hasPrev).toBe(false)
    })

    it('应该处理少于一页的数据', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      expect(result.current.totalPages).toBe(1)
      expect(result.current.paginatedItems).toHaveLength(5)
      expect(result.current.hasNext).toBe(false)
      expect(result.current.hasPrev).toBe(false)
    })

    it('应该处理正好整页的数据', () => {
      const items = Array.from({ length: 40 }, (_, i) => ({ id: i, text: `Task ${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))

      expect(result.current.totalPages).toBe(4)

      // 跳到最后一页
      act(() => {
        result.current.goToPage(4)
      })

      expect(result.current.paginatedItems).toHaveLength(10)
      expect(result.current.hasNext).toBe(false)
    })
  })
})