/**
 * AI任务分析服务
 * 使用SiliconFlow API分析用户的任务完成情况
 */

const API_KEY = 'sk-btyuudakfmmaelutspbrtwvflzylcomavbnozfelnbjvcivx';
const API_BASE_URL = 'https://api.siliconflow.cn/v1';

/**
 * 调用SiliconFlow聊天完成API
 */
export async function callSiliconFlowAPI(messages, model = 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B') {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('SiliconFlow API调用错误:', error);
    throw error;
  }
}

/**
 * 分析收纳箱中的任务数据
 */
export async function analyzeTrashTasks(deletedTasks, taskLists) {
  if (!deletedTasks || deletedTasks.length === 0) {
    return {
      summary: '收纳箱暂时为空，没有可分析的数据。',
      insights: [],
      recommendations: ['继续保持良好的任务管理习惯！'],
    };
  }

  // 创建任务列表映射
  const taskListMap = taskLists.reduce((map, list) => {
    map[list.id] = list.name;
    return map;
  }, {});

  // 准备任务数据用于分析
  const taskData = deletedTasks.map(task => ({
    name: task.text,
    project: taskListMap[task.listId] || '未知项目',
    quadrant: getQuadrantName(task.quadrant),
    createdAt: task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '未知',
    completedAt: task.completedAt ? new Date(task.completedAt).toLocaleDateString('zh-CN') : '未完成',
    completed: task.completed ? '已完成' : '已删除',
    deletedAt: new Date(task.updatedAt).toLocaleDateString('zh-CN'),
  }));

  // 构建分析提示词
  const analysisPrompt = `
请分析以下用户的任务完成情况，这些都是已删除或完成的任务：

任务数据：
${JSON.stringify(taskData, null, 2)}

任务统计：
- 总任务数：${deletedTasks.length}
- 已完成任务：${deletedTasks.filter(t => t.completed).length}
- 未完成删除：${deletedTasks.filter(t => !t.completed).length}
- 各象限分布：
  - 重要且紧急：${deletedTasks.filter(t => t.quadrant === 1).length}
  - 重要不紧急：${deletedTasks.filter(t => t.quadrant === 2).length}
  - 紧急不重要：${deletedTasks.filter(t => t.quadrant === 3).length}
  - 不重要不紧急：${deletedTasks.filter(t => t.quadrant === 4).length}

请基于以上数据，生成一份简洁的任务完成分析报告，包含：
1. 总体完成情况总结
2. 时间管理模式分析
3. 任务优先级习惯评估
4. 具体的改进建议

请用友好、鼓励的语调，提供实用的建议。回复格式为JSON：
{
  "summary": "总体完成情况的简短总结",
  "insights": ["关键洞察1", "关键洞察2", "关键洞察3"],
  "recommendations": ["建议1", "建议2", "建议3"]
}
`;

  try {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的效率管理顾问，擅长使用重要，紧急，重要不紧急，不紧急，重要不重要、不紧急，这四个象限进行任务管理并提升效率。 你将分析用户的任务完成情况，并提供实用的建议和洞察。',
      },
      {
        role: 'user',
        content: analysisPrompt
      }
    ];

    const result = await callSiliconFlowAPI(messages);
    
    // 尝试解析JSON响应
    try {
      return JSON.parse(result);
    } catch (parseError) {
      // 如果JSON解析失败，返回原始文本作为摘要
      return {
        summary: result,
        insights: [],
        recommendations: ['继续保持良好的任务管理习惯！'],
      };
    }
  } catch (error) {
    console.error('任务分析失败:', error);
    return {
      summary: 'AI分析服务暂时不可用，请稍后再试。',
      insights: ['分析服务连接失败'],
      recommendations: ['请检查网络连接后重试'],
      error: error.message
    };
  }
}

/**
 * 获取象限名称
 */
function getQuadrantName(quadrant) {
  const names = {
    1: '重要且紧急',
    2: '重要不紧急', 
    3: '紧急不重要',
    4: '不重要不紧急'
  };
  return names[quadrant] || '未知象限';
}

/**
 * 快速洞察分析（不调用API的本地分析）
 */
export function getQuickInsights(deletedTasks) {
  if (!deletedTasks || deletedTasks.length === 0) {
    return {
      completionRate: 0,
      mostActiveQuadrant: '暂无数据',
      totalTasks: 0
    };
  }

  const completedTasks = deletedTasks.filter(task => task.completed).length;
  const completionRate = Math.round((completedTasks / deletedTasks.length) * 100);

  // 找出最活跃的象限
  const quadrantCounts = {1: 0, 2: 0, 3: 0, 4: 0};
  deletedTasks.forEach(task => {
    quadrantCounts[task.quadrant] = (quadrantCounts[task.quadrant] || 0) + 1;
  });

  const mostActiveQuadrant = Object.entries(quadrantCounts)
    .reduce((a, b) => quadrantCounts[a[0]] > quadrantCounts[b[0]] ? a : b)[0];

  const quadrantNames = {
    1: '重要且紧急',
    2: '重要不紧急', 
    3: '紧急不重要',
    4: '不重要不紧急'
  };

  return {
    completionRate,
    mostActiveQuadrant: quadrantNames[mostActiveQuadrant],
    totalTasks: deletedTasks.length,
    completedTasks,
    pendingTasks: deletedTasks.length - completedTasks
  };
}