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
    <button
      onClick={handleAddTask}
      title="添加任务"
      className="fixed bottom-8 right-8 z-[101] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[var(--accent-gold)] text-2xl text-white shadow-[0_4px_20px_rgba(212,165,116,0.4)] transition-transform duration-300 ease-in-out hover:rotate-90 hover:scale-110 md:hidden"
    >
      ＋
    </button>
  );
} 