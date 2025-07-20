'use client';

import React from 'react';
import Quadrant from './Quadrant';
import DragContext from './DragContext';
import LoadingState, { LoadingWrapper } from '@/components/LoadingState';
import { useTaskStore } from '@/stores/taskStore';
import { useTaskListStore } from '@/stores/taskListStore';
import { useThrottle } from '@/hooks/useDebounce';
import { arrayMove } from '@dnd-kit/sortable';

const QUADRANT_CONFIG = [
  {
    id: 1,
    title: '重要且紧急',
    tooltip: '重要且紧急的事要立即做',
    isFirst: true
  },
  {
    id: 2,
    title: '重要不紧急',
    tooltip: '这类事需要安排时间做',
    isFirst: false
  },
  {
    id: 3,
    title: '紧急不重要',
    tooltip: '这类事由于不重要所以可以在低能量时做，或者外包给别人做',
    isFirst: false
  },
  {
    id: 4,
    title: '不重要不紧急',
    tooltip: '这类事可以考虑是否真的需要做',
    isFirst: false
  }
];

// Helper to flatten tasks into single array
function flattenTasks(tasksObj) {
  return Object.values(tasksObj).flat();
}

// 深度比较函数 - 更高效的任务比较
function deepCompareTasks(prevTasks, nextTasks) {
  if (prevTasks.length !== nextTasks.length) return false;
  
  for (let i = 0; i < prevTasks.length; i++) {
    const prev = prevTasks[i];
    const next = nextTasks[i];
    
    if (prev.id !== next.id || 
        prev.text !== next.text || 
        prev.completed !== next.completed ||
        prev.order !== next.order ||
        prev.estimatedTime !== next.estimatedTime) {
      return false;
    }
  }
  return true;
}

// 记忆化Quadrant组件以避免不必要的重渲染
const MemoizedQuadrant = React.memo(Quadrant, (prevProps, nextProps) => {
  // 只有当关键属性发生变化时才重新渲染
  return (
    prevProps.quadrantId === nextProps.quadrantId &&
    prevProps.title === nextProps.title &&
    prevProps.tooltip === nextProps.tooltip &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.layoutMode === nextProps.layoutMode &&
    prevProps.showETA === nextProps.showETA &&
    deepCompareTasks(prevProps.tasks, nextProps.tasks)
  );
});

export default function QuadrantGrid() {
  const { activeList } = useTaskListStore();
  const { 
    tasks, 
    loading, 
    error, 
    addTask, 
    updateTask, 
    deleteTask, 
    toggleComplete, 
    updateTaskText, 
    moveTask, 
    reorderTasks,
    smartUpdate,
    batchUpdate
  } = useTaskStore();

  // 节流的移动操作，避免拖拽过程中频繁更新
  const throttledMoveTask = useThrottle(moveTask, 150, [moveTask]);
  const throttledReorderTasks = useThrottle(reorderTasks, 150, [reorderTasks]);

  // 布局与显示时间配置（向后兼容）
  const layoutMode = activeList?.layoutMode || 'FOUR'; // 'FOUR' | 'SINGLE'
  const showETA = activeList?.showETA !== undefined ? activeList.showETA : true;

  // 处理拖拽结束
  const handleDragEnd = async event => {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = active.id;
    const overId = over.id;

    // 找到被拖拽的任务
    let activeTask = null;
    let activeQuadrant = null;

    for (const quadrant in tasks) {
      const task = tasks[quadrant].find(t => t.id === activeTaskId);
      if (task) {
        activeTask = task;
        activeQuadrant = parseInt(quadrant);
        break;
      }
    }

    if (!activeTask) return;

    // 检查是否拖拽到另一个任务上 (重新排序)
    let targetTask = null;
    let targetQuadrant = null;

    for (const quadrant in tasks) {
      const task = tasks[quadrant].find(t => t.id === overId);
      if (task) {
        targetTask = task;
        targetQuadrant = parseInt(quadrant);
        break;
      }
    }

    if (targetTask) {
      // 在同一象限内重新排序
      if (activeQuadrant === targetQuadrant) {
        const quadrantTasks = [...tasks[activeQuadrant]];
        const oldIndex = quadrantTasks.findIndex(t => t.id === activeTaskId);
        const newIndex = quadrantTasks.findIndex(t => t.id === overId);

        if (oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(quadrantTasks, oldIndex, newIndex);
          await throttledReorderTasks(activeQuadrant, reorderedTasks);
        }
      } else {
        // 移动到不同象限
        const targetIndex = tasks[targetQuadrant].findIndex(t => t.id === overId);
        await throttledMoveTask(activeTaskId, activeQuadrant, targetQuadrant, targetIndex);
      }
    } else {
      // 检查是否拖拽到象限容器上
      const quadrantMatch = overId.match(/^quadrant-(\d+)$/);
      if (quadrantMatch) {
        const targetQuadrant = parseInt(quadrantMatch[1]);
        if (activeQuadrant !== targetQuadrant) {
          // 移动到象限末尾
          await throttledMoveTask(activeTaskId, activeQuadrant, targetQuadrant, tasks[targetQuadrant].length);
        }
      }
    }
  };

  // 检查是否为空数据状态
  const isEmpty = !loading && Object.values(tasks).every(arr => arr.length === 0);

  const retryLoadTasks = () => {
    const { loadTasks, currentListId } = useTaskStore.getState();
    loadTasks(currentListId, true);
  };

  // 根据布局确定渲染的象限
  const quadrantsToRender = layoutMode === 'FOUR' ? QUADRANT_CONFIG : [QUADRANT_CONFIG[0]];

  return (
    <DragContext onDragEnd={handleDragEnd}>
      <main className="mx-auto">
        <LoadingWrapper
          loading={loading}
          error={error}
          empty={isEmpty}
          emptyMessage="还没有任务，点击空白区域添加第一个任务吧！"
          errorMessage="加载任务失败"
          loadingType="skeleton-quadrant"
          loadingMessage="正在加载任务数据..."
          onRetry={retryLoadTasks}
        >
          <div className={layoutMode === 'FOUR' ? 'grid grid-cols-1 gap-6 p-3  md:p-6 md:grid-cols-2  md:justify-center' : 'flex flex-col gap-6 p-3 md:p-6 max-w-xl mx-auto'}>
            {quadrantsToRender.map(config => (
              <MemoizedQuadrant
                key={config.id}
                quadrantId={config.id}
                title={config.title}
                tooltip={config.tooltip}
                isFirst={config.isFirst}
                tasks={layoutMode === 'FOUR' ? (tasks[config.id] || []) : flattenTasks(tasks)}
                isLoading={loading}
                onAddTask={text => addTask(config.id, text)}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onToggleComplete={toggleComplete}
                onUpdateTaskText={updateTaskText}
                layoutMode={layoutMode}
                showETA={showETA}
              />
            ))}
          </div>
        </LoadingWrapper>
      </main>
    </DragContext>
  );
}
