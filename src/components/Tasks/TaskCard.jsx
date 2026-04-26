import { useState } from 'react'
import { formatTime, formatDuration, getStatusConfig, getPriorityConfig, getTrackConfig, getPScoreColor } from '../../utils/helpers'
import { IconEdit, IconTrash, IconCheck } from '../Icons'
import './TaskCard.css'

export default function TaskCard({ task, onComplete, onEdit, onDelete, goals = [] }) {
  const [expanded, setExpanded] = useState(false)

  const priorityCfg = getPriorityConfig(task.priority)
  const trackCfg = getTrackConfig(task.track)
  const pScoreColor = getPScoreColor(task.pScoreValue || 0)

  const relatedGoal = goals.find(g => g.id === task.relevantGoalId)
  const isCompleted = task.status === 'completed'
  const isInProgress = task.status === 'in_progress'

  return (
    <div
      className={`task-card ${task.track === 'work' ? 'track-work' : 'track-life'} ${isCompleted ? 'task-completed' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top row */}
      <div className="task-card-top">
        <div className="task-card-left">
          <button
            className={`task-check ${isCompleted ? 'checked' : ''}`}
            onClick={(e) => { e.stopPropagation(); onComplete?.(task) }}
            title={isCompleted ? '标记未完成' : '标记完成'}
          >
            {isCompleted && <IconCheck size={10} />}
          </button>

          <div className="task-card-info">
            <div className="task-card-title">{task.specific}</div>
            <div className="task-card-meta">
              <span className="task-time">{formatTime(task.startTime)} – {formatTime(task.endTime)}</span>
              <span className="task-duration">{formatDuration(task.estimatedHours)}</span>
            </div>
          </div>
        </div>

        <div className="task-card-right">
          {task.pScoreValue > 0 && (
            <span className="pscore-badge" style={{ color: pScoreColor }}>
              P{task.pScoreValue}
            </span>
          )}
          <span className={`badge ${priorityCfg.className}`}>{priorityCfg.label}</span>
          <span className={`badge ${trackCfg.className}`}>{trackCfg.label}</span>

          <div className="task-card-actions" onClick={e => e.stopPropagation()}>
            <button className="btn-icon btn-sm" onClick={() => onEdit?.(task)} title="编辑">
              <IconEdit size={12} />
            </button>
            <button className="btn-icon btn-sm" onClick={() => onDelete?.(task.id)} title="删除">
              <IconTrash size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {isInProgress && (
        <div className="task-in-progress-bar">
          <div className="in-progress-fill" />
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="task-card-details">
          <div className="task-detail-row">
            <span className="task-detail-label">验收标准</span>
            <span className="task-detail-value">{task.measurable}</span>
          </div>
          {relatedGoal && (
            <div className="task-detail-row">
              <span className="task-detail-label">关联目标</span>
              <span className="task-detail-value">{relatedGoal.title}</span>
            </div>
          )}
          {task.tags?.length > 0 && (
            <div className="task-detail-row">
              <span className="task-detail-label">标签</span>
              <div className="task-tags">
                {task.tags.map(tag => (
                  <span key={tag} className="pill">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {task.pScore && (
            <div className="task-detail-row">
              <span className="task-detail-label">P-Score</span>
              <div className="pscore-details">
                <span>重要度: {task.pScore.relevance}</span>
                <span>紧急度: {task.pScore.urgency}</span>
                <span>精力: {task.pScore.energyLevel === 'high' ? '高' : task.pScore.energyLevel === 'medium' ? '中' : '低'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
