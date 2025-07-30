'use client';

import { useState, useEffect } from 'react';
import * as supabaseDb from '@/lib/supabase-db';
import { useAuthStore } from '@/stores/authStore';

export default function TestSupabase() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, initialized, initialize } = useAuthStore();
  
  useEffect(() => {
    // 初始化认证状态
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const addResult = (title, data, error = null) => {
    setResults(prev => [...prev, {
      id: Date.now(),
      title,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runTest = async (testName, testFn) => {
    try {
      setLoading(true);
      const result = await testFn();
      addResult(testName, result);
    } catch (error) {
      addResult(testName, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const testGetTaskLists = () => runTest('获取任务列表', 
    () => supabaseDb.getSupabaseTaskLists()
  );

  const testAddTaskList = () => runTest('添加任务列表',
    () => supabaseDb.addSupabaseTaskList(`测试列表 ${Date.now()}`, {
      layoutMode: 'FOUR',
      showETA: true
    })
  );

  const testAddTask = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('添加任务', null, '请先创建一个任务列表');
      return;
    }
    
    runTest('添加任务', () => supabaseDb.addSupabaseTask({
      id: crypto.randomUUID(),
      text: `测试任务 ${Date.now()}`,
      completed: 0,
      deleted: 0,
      quadrant: 1,
      listId: lists[0].id,
      estimatedTime: '',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  };

  const testGetTasks = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('获取任务', null, '没有任务列表');
      return;
    }
    
    runTest('获取任务', () => supabaseDb.getSupabaseTasks(lists[0].id));
  };

  const testUserDataExists = () => runTest('检查用户数据',
    () => supabaseDb.getUserDataExists(user?.id)
  );

  // 任务列表操作
  const testUpdateTaskList = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('更新任务列表', null, '没有任务列表可更新');
      return;
    }
    
    runTest('更新任务列表', () => supabaseDb.updateSupabaseTaskList(lists[0].id, {
      name: `更新的列表 ${Date.now()}`
    }));
  };

  const testDeleteTaskList = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('删除任务列表', null, '没有任务列表可删除');
      return;
    }
    
    // 找到一个非激活的列表来删除
    const listToDelete = lists.find(l => l.isActive !== 1) || lists[lists.length - 1];
    
    runTest('删除任务列表', () => supabaseDb.deleteSupabaseTaskList(listToDelete.id));
  };

  const testSetActiveTaskList = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('设置激活列表', null, '没有任务列表');
      return;
    }
    
    // 找到一个非激活的列表来激活
    const inactiveList = lists.find(l => l.isActive !== 1) || lists[0];
    
    runTest('设置激活列表', () => supabaseDb.setSupabaseActiveTaskList(inactiveList.id));
  };

  // 任务操作
  const testUpdateTask = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('更新任务', null, '请先创建任务列表');
      return;
    }
    
    const tasks = await supabaseDb.getSupabaseTasks(lists[0].id);
    if (tasks.length === 0) {
      addResult('更新任务', null, '没有任务可更新');
      return;
    }
    
    runTest('更新任务', () => supabaseDb.updateSupabaseTask(tasks[0].id, {
      text: `更新的任务 ${Date.now()}`,
      completed: tasks[0].completed === 0 ? 1 : 0
    }));
  };

  const testDeleteTask = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('删除任务', null, '请先创建任务列表');
      return;
    }
    
    const tasks = await supabaseDb.getSupabaseTasks(lists[0].id);
    if (tasks.length === 0) {
      addResult('删除任务', null, '没有任务可删除');
      return;
    }
    
    runTest('删除任务（软删除）', () => supabaseDb.deleteSupabaseTask(tasks[0].id, false));
  };

  const testMoveTask = async () => {
    const lists = await supabaseDb.getSupabaseTaskLists();
    if (lists.length === 0) {
      addResult('移动任务', null, '请先创建任务列表');
      return;
    }
    
    const tasks = await supabaseDb.getSupabaseTasks(lists[0].id);
    if (tasks.length === 0) {
      addResult('移动任务', null, '没有任务可移动');
      return;
    }
    
    const task = tasks[0];
    const newQuadrant = task.quadrant === 4 ? 1 : task.quadrant + 1;
    
    runTest('移动任务', () => supabaseDb.moveSupabaseTask(
      task.id, 
      task.quadrant, 
      newQuadrant, 
      0
    ));
  };

  const clearResults = () => setResults([]);

  // 等待认证状态初始化
  if (!initialized) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase 数据层测试</h1>
        <div className="bg-blue-100 p-4 rounded">
          正在加载认证状态...
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase 数据层测试</h1>
        <div className="bg-yellow-100 p-4 rounded">
          请先登录后再进行测试
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase 数据层测试</h1>
      
      <div className="mb-4 p-4 bg-green-100 rounded">
        <p>当前用户: {user?.email}</p>
        <p>用户ID: {user?.id}</p>
      </div>

      <div className="mb-6 space-y-4">
        {/* 任务列表操作 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">任务列表操作</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testGetTaskLists}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              获取列表
            </button>
            
            <button
              onClick={testAddTaskList}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              添加列表
            </button>
            
            <button
              onClick={testUpdateTaskList}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              更新列表
            </button>
            
            <button
              onClick={testDeleteTaskList}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              删除列表
            </button>
            
            <button
              onClick={testSetActiveTaskList}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              激活列表
            </button>
          </div>
        </div>

        {/* 任务操作 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">任务操作</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testGetTasks}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              获取任务
            </button>
            
            <button
              onClick={testAddTask}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              添加任务
            </button>
            
            <button
              onClick={testUpdateTask}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              更新任务
            </button>
            
            <button
              onClick={testDeleteTask}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              删除任务
            </button>
            
            <button
              onClick={testMoveTask}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              移动任务
            </button>
          </div>
        </div>

        {/* 其他操作 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">其他操作</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testUserDataExists}
              disabled={loading}
              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
            >
              检查用户数据
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清空结果
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {results.map(result => (
          <div key={result.id} className={`p-4 rounded ${result.error ? 'bg-red-100' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{result.title}</h3>
              <span className="text-sm text-gray-500">{result.timestamp}</span>
            </div>
            {result.error ? (
              <div className="text-red-600">错误: {result.error}</div>
            ) : (
              <pre className="text-sm overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded">
          正在执行测试...
        </div>
      )}
    </div>
  );
}