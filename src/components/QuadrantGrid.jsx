'use client';

import React from 'react';
import Quadrant from './Quadrant';
import DragContext from './DragContext';
import { useTasks } from '@/hooks/useTasks';
import { useTaskLists } from '@/hooks/useTaskLists';
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

// 记忆化Quadrant组件以避免不必要的重渲染
const MemoizedQuadrant = React.memo(Quadrant, (prevProps, nextProps) => {
  // 只有当关键属性发生变化时才重新渲染
  return (
    prevProps.quadrantId === nextProps.quadrantId &&
    prevProps.title === nextProps.title &&
    prevProps.tooltip === nextProps.tooltip &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLoading === nextProps.isLoading &&
    JSON.stringify(prevProps.tasks) === JSON.stringify(nextProps.tasks)
  );
});

export default function QuadrantGrid() {
  const { activeList } = useTaskLists();
  const { tasks, loading, error, addTask, updateTask, deleteTask, toggleComplete, updateTaskText, moveTask, reorderTasks } = useTasks(activeList?.id);

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
          await reorderTasks(activeQuadrant, reorderedTasks);
        }
      } else {
        // 移动到不同象限
        const targetIndex = tasks[targetQuadrant].findIndex(t => t.id === overId);
        await moveTask(activeTaskId, activeQuadrant, targetQuadrant, targetIndex);
      }
    } else {
      // 检查是否拖拽到象限容器上
      const quadrantMatch = overId.match(/^quadrant-(\d+)$/);
      if (quadrantMatch) {
        const targetQuadrant = parseInt(quadrantMatch[1]);
        if (activeQuadrant !== targetQuadrant) {
          // 移动到象限末尾
          await moveTask(activeTaskId, activeQuadrant, targetQuadrant, tasks[targetQuadrant].length);
        }
      }
    }
  };

  // 移除全局loading状态，改为在数据为空时显示skeleton

  if (error) {
    return (
      <main className="mx-auto px-4 py-4 md:p-8 max-w-[1400px]">
        <div className="grid gap-6">
          <div className="py-8 text-center text-red-500">错误: {error}</div>
        </div>
      </main>
    );
  }

  return (
    <DragContext onDragEnd={handleDragEnd}>
      <main className="mx-auto">
        <div className="grid grid-cols-1 gap-6 p-3  md:p-6 md:grid-cols-2  md:justify-center">
          {QUADRANT_CONFIG.map(config => (
            <MemoizedQuadrant
              key={config.id}
              quadrantId={config.id}
              title={config.title}
              tooltip={config.tooltip}
              isFirst={config.isFirst}
              tasks={tasks[config.id] || []}
              isLoading={loading}
              onAddTask={text => addTask(config.id, text)}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onToggleComplete={toggleComplete}
              onUpdateTaskText={updateTaskText}
            />
          ))}
        </div>
      </main>
    </DragContext>
  );
}
