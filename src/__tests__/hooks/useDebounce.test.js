import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebounceLeading, useThrottle } from '@/hooks/useDebounce'

// Mock timers
jest.useFakeTimers()

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('应该延迟执行回调函数', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current('test')
    })

    // 立即检查，回调不应该被调用
    expect(callback).not.toHaveBeenCalled()

    // 快进时间
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('test')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('应该取消之前的调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    // 多次快速调用
    act(() => {
      result.current('first')
      result.current('second')
      result.current('third')
    })

    // 快进到延迟时间
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 只有最后一次调用应该被执行
    expect(callback).toHaveBeenCalledWith('third')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('应该在依赖变化时重新创建防抖函数', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebounce(callback, delay),
      { initialProps: { callback: callback1, delay: 500 } }
    )

    act(() => {
      result.current('test1')
    })

    // 更改回调函数
    rerender({ callback: callback2, delay: 500 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 原回调不应该被调用，因为依赖已变化
    expect(callback1).not.toHaveBeenCalled()

    act(() => {
      result.current('test2')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback2).toHaveBeenCalledWith('test2')
  })

  it('应该处理不同的延迟时间', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 1000))

    act(() => {
      result.current('test')
    })

    // 500ms 后检查
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(callback).not.toHaveBeenCalled()

    // 1000ms 后检查
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(callback).toHaveBeenCalledWith('test')
  })
})

describe('useDebounceLeading', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('应该立即执行第一次调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceLeading(callback, 500))

    act(() => {
      result.current('first')
    })

    // 第一次调用应该立即执行
    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('应该防抖后续调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceLeading(callback, 500))

    act(() => {
      result.current('first')
      result.current('second')
      result.current('third')
    })

    // 只有第一次调用应该被执行
    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledTimes(1)

    // 快进时间
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 防抖结束后应该执行最后一次调用
    expect(callback).toHaveBeenCalledWith('third')
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('应该在延迟时间后重置状态', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceLeading(callback, 500))

    // 第一次调用
    act(() => {
      result.current('first')
    })

    // 等待延迟时间过去
    act(() => {
      jest.advanceTimersByTime(600)
    })

    // 新的调用应该立即执行
    act(() => {
      result.current('second')
    })

    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledWith('second')
    expect(callback).toHaveBeenCalledTimes(2)
  })
})

describe('useThrottle', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('应该立即执行第一次调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 500))

    act(() => {
      result.current('test')
    })

    expect(callback).toHaveBeenCalledWith('test')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('应该在节流期间忽略后续调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 500))

    act(() => {
      result.current('first')
      result.current('second')
      result.current('third')
    })

    // 只有第一次调用应该被执行
    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('应该在节流期间结束后允许新的调用', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 500))

    // 第一次调用
    act(() => {
      result.current('first')
    })

    // 快进时间，超过节流期间
    act(() => {
      jest.advanceTimersByTime(600)
    })

    // 新的调用应该被执行
    act(() => {
      result.current('second')
    })

    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledWith('second')
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('应该正确处理节流间隔边界情况', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 500))

    // 第一次调用
    act(() => {
      result.current('first')
    })

    // 在节流期间内调用
    act(() => {
      jest.advanceTimersByTime(499)
      result.current('second')
    })

    // 正好在节流期间结束时调用
    act(() => {
      jest.advanceTimersByTime(1)
      result.current('third')
    })

    expect(callback).toHaveBeenCalledWith('first')
    expect(callback).toHaveBeenCalledWith('third')
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('应该在依赖数组变化时重新创建节流函数', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()

    const { result, rerender } = renderHook(
      ({ callback, delay }) => useThrottle(callback, delay),
      { initialProps: { callback: callback1, delay: 500 } }
    )

    act(() => {
      result.current('test1')
    })

    expect(callback1).toHaveBeenCalledWith('test1')

    // 更改依赖
    rerender({ callback: callback2, delay: 500 })

    // 新的回调应该能立即执行（因为依赖变化重置了状态）
    act(() => {
      result.current('test2')
    })

    expect(callback2).toHaveBeenCalledWith('test2')
  })
})

describe('边界情况和错误处理', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('应该处理 0 延迟的防抖', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 0))

    act(() => {
      result.current('test')
    })

    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(callback).toHaveBeenCalledWith('test')
  })

  it('应该处理负数延迟', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, -100))

    act(() => {
      result.current('test')
    })

    // 即使是负数延迟，setTimeout 也会在下一个 tick 执行
    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(callback).toHaveBeenCalledWith('test')
  })

  it('应该处理 undefined 回调', () => {
    const { result } = renderHook(() => useDebounce(undefined, 500))

    // 应该不会抛出错误
    expect(() => {
      act(() => {
        result.current('test')
      })
    }).not.toThrow()
  })
})