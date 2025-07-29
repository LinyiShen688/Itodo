// 手动测试脚本，用于验证数据库升级
// 在浏览器控制台中运行此代码

async function testDatabaseUpgrade() {
  console.log('开始测试数据库升级到版本5...');
  
  try {
    // 导入初始化函数
    const { initDB } = await import('/src/lib/indexeddb.js');
    
    // 初始化数据库
    const db = await initDB();
    
    console.log('数据库版本:', db.version);
    console.log('数据库名称:', db.name);
    console.log('对象存储列表:', Array.from(db.objectStoreNames));
    
    // 验证syncQueue存储是否存在
    if (db.objectStoreNames.contains('syncQueue')) {
      console.log('✅ syncQueue存储已成功创建');
      
      // 测试添加数据到syncQueue
      const testItem = {
        id: crypto.randomUUID(),
        status: 'pending',
        action: 'add',
        entityType: 'task',
        entityId: crypto.randomUUID(),
        changes: { text: '测试任务' },
        createdAt: new Date(),
        completedAt: null,
        retryCount: 0,
        error: null
      };
      
      await db.add('syncQueue', testItem);
      console.log('✅ 成功添加测试数据到syncQueue');
      
      // 读取数据验证
      const saved = await db.get('syncQueue', testItem.id);
      console.log('✅ 成功读取数据:', saved);
      
      // 测试索引查询
      const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');
      console.log('✅ 通过索引查询到的pending项:', pendingItems.length);
      
    } else {
      console.error('❌ syncQueue存储未创建');
    }
    
    // 验证现有数据是否保留
    const tasks = await db.getAll('tasks');
    const taskLists = await db.getAll('taskLists');
    
    console.log(`现有任务数量: ${tasks.length}`);
    console.log(`现有任务列表数量: ${taskLists.length}`);
    
    db.close();
    console.log('✅ 数据库升级测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 在浏览器控制台运行：
 testDatabaseUpgrade();