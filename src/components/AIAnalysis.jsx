'use client';

import { useState } from 'react';
import { analyzeTrashTasks, getQuickInsights } from '@/services/aiAnalysis';

export default function AIAnalysis({ deletedTasks, taskLists }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // 获取快速洞察
  const quickInsights = getQuickInsights(deletedTasks);

  // 执行AI分析
  const handleAnalyze = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeTrashTasks(deletedTasks, taskLists);
      setAnalysis(result);
      setShowFullReport(true);
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysis({
        summary: '分析过程中出现错误，请稍后重试。',
        insights: [],
        recommendations: [],
        error: error.message
      });
      setShowFullReport(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="ai-analysis-section">
      <h2>🤖 AI分析</h2>
      
      {/* 快速统计 */}
      <div className="quick-stats" style={{
        background: 'var(--white-trans)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1rem',
        fontSize: '0.85rem'
      }}>
        <div style={{color: 'var(--ink-brown)', marginBottom: '0.5rem'}}>
          <strong>快速统计</strong>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem'}}>
          <div>任务总数：{quickInsights.totalTasks}</div>
          <div>完成率：{quickInsights.completionRate}%</div>
          <div>已完成：{quickInsights.completedTasks}</div>
          <div>未完成：{quickInsights.pendingTasks}</div>
        </div>
        {quickInsights.totalTasks > 0 && (
          <div style={{marginTop: '0.5rem', fontSize: '0.8rem', opacity: '0.8'}}>
            最活跃象限：{quickInsights.mostActiveQuadrant}
          </div>
        )}
      </div>

      {/* AI深度分析按钮 */}
      <button 
        className={`ai-analyze-btn ${isAnalyzing ? 'analyzing' : ''}`}
        onClick={handleAnalyze}
        disabled={isAnalyzing || !deletedTasks || deletedTasks.length === 0}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: isAnalyzing ? 'var(--shadow-soft)' : 'var(--accent-gold)',
          color: isAnalyzing ? 'var(--ink-brown)' : 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: isAnalyzing || !deletedTasks?.length ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          fontSize: '0.9rem',
          fontWeight: '500',
          opacity: isAnalyzing || !deletedTasks?.length ? 0.6 : 1,
          marginBottom: '1rem'
        }}
      >
        {isAnalyzing ? (
          <>
            <span style={{marginRight: '0.5rem'}}>🔄</span>
            AI分析中...
          </>
        ) : (
          <>
            <span style={{marginRight: '0.5rem'}}>🤖</span>
            {deletedTasks?.length ? 'AI深度分析' : '暂无数据可分析'}
          </>
        )}
      </button>

      {/* 分析结果 */}
      {showFullReport && analysis && (
        <div className="analysis-result" style={{
          background: 'var(--white-trans)',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <strong style={{color: 'var(--ink-brown)', fontSize: '0.9rem'}}>
              📊 分析报告
            </strong>
            <button 
              onClick={() => setShowFullReport(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ink-brown)',
                cursor: 'pointer',
                fontSize: '1rem',
                opacity: '0.6',
                padding: '0.2rem'
              }}
            >
              ×
            </button>
          </div>

          {/* 总结 */}
          {analysis.summary && (
            <div style={{marginBottom: '0.75rem'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '0.3rem'}}>
                📈 总体情况
              </div>
              <p style={{fontSize: '0.85rem', lineHeight: '1.4', margin: 0, color: 'var(--ink-black)'}}>
                {analysis.summary}
              </p>
            </div>
          )}

          {/* 洞察 */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div style={{marginBottom: '0.75rem'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '0.3rem'}}>
                💡 关键洞察
              </div>
              <ul style={{margin: 0, paddingLeft: '1rem', fontSize: '0.8rem', lineHeight: '1.4'}}>
                {analysis.insights.map((insight, index) => (
                  <li key={index} style={{marginBottom: '0.2rem', color: 'var(--ink-black)'}}>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议 */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <div style={{fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '0.3rem'}}>
                🎯 改进建议
              </div>
              <ul style={{margin: 0, paddingLeft: '1rem', fontSize: '0.8rem', lineHeight: '1.4'}}>
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} style={{marginBottom: '0.2rem', color: 'var(--ink-black)'}}>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 错误提示 */}
          {analysis.error && (
            <div style={{
              fontSize: '0.8rem',
              color: '#e74c3c',
              background: 'rgba(231, 76, 60, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              marginTop: '0.5rem'
            }}>
              错误: {analysis.error}
            </div>
          )}
        </div>
      )}

      {/* 提示信息 */}
      {!deletedTasks || deletedTasks.length === 0 ? (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--ink-brown)',
          opacity: '0.6',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          收纳箱中还没有任务数据
        </div>
      ) : (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--ink-brown)',
          opacity: '0.6',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          基于收纳箱中 {deletedTasks.length} 个任务的数据分析
        </div>
      )}
    </div>
  );
}