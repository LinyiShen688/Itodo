'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import QuadrantGrid from '@/components/QuadrantGrid';
import Sidebar from '@/components/Sidebar';
import LoadingState from '@/components/LoadingState';
import { useTrashStore } from '@/stores/trashStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTaskListStore } from '@/stores/taskListStore';
import { toast } from '@/utils/toast';

export default function Home() {
  const { activeList, loading: listsLoading } = useTaskListStore();
  const initializeTrashStore = useTrashStore((state) => state.initializeTrashStore);
  const initializeTaskListStore = useTaskListStore((state) => state.initialize);

  // 检查登录成功参数
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');
    console.log(loginStatus,'loginStatus');
    
    if (loginStatus === 'success') {

      // 显示登录成功提示
      toast.success('登录成功');
      
      // 清除URL参数
      urlParams.delete('login');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 初始化Zustand stores
  useEffect(() => {
    const initStores = async () => {
      await initializeTrashStore();
      await initializeTaskListStore();
    };
    initStores();
  }, [initializeTrashStore, initializeTaskListStore]);

  if (listsLoading) {
    return (
      <LoadingState 
        type="skeleton-quadrant"
        message="正在加载应用数据..."
        className="min-h-screen"
      />
    );
  }

  return (
    <>
      <Header currentTaskName={activeList?.name || "今日待办"} />
      <QuadrantGrid />
      <Sidebar />
    </>
  );
}
