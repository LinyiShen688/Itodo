'use client';

import { useTasks } from '@/hooks/useTasks';
import { useTaskLists } from '@/hooks/useTaskLists';

export default function FAB() {
  const { activeList } = useTaskLists();
  const { addTask } = useTasks(activeList?.id);

  const handleAddTask = async () => {
    try {
      // 默认添加到第一象限
      await addTask(1, '');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <button className="fab" onClick={handleAddTask}>
      ＋
    </button>
  );
} 