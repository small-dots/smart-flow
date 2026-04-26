import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../utils/api'
import { formatTime } from '../../utils/helpers'
import './ReminderPanel.css'

const REMIND_BEFORE_MINS = 90

const PRIORITY_CFG = {
  urgent: { label: '紧急', color: '#ef4444' },
  high:   { label: '高优', color: '#f59e0b' },
  medium: { label: '中', color: '#7170ff' },
  low:    { label: '低', color: '#62666d' },
}

export default function ReminderPanel() {
  const [reminders, setReminders] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const dismissedRef = useRef(new Set())

  const checkReminders = useCallback(async () => {
    try {
      const now = new Date()
      const td = await api.getTasks()
      const upcoming = (td.tasks || []).filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled') return false
        if (dismissedRef.current.has(t.id)) return false
        const start = new Date(t.startTime)
        const diffMins = (start - now) / (1000 * 60)
        return diffMins >= -5 && diffMins <= REMIND_BEFORE_MINS
      })
      // Sort: soonest first, then by priority
      const pRank = { urgent: 4, high: 3, medium: 2, low: 1 }
      upcoming.sort((a, b) => {
        const td = new Date(a.startTime) - new Date(b.startTime)
        return td !== 0 ? td : (pRank[b.priority] || 0) - (pRank[a.priority] || 0)
      })
      setReminders(upcoming.slice(0, 6))
    } catch (_) {}
  }, [])

  useEffect(() => {
    checkReminders()
    const timer = setInterval(checkReminders, 60_000)
    return () => clearInterval(timer)
  }, [checkReminders])

  const dismiss = (id) => {
    dismissedRef.current.add(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const dismissAll = () => {
    reminders.forEach(r => dismissedRef.current.add(r.id))
    setReminders([])
  }

  if (reminders.length === 0) return null

  const now = new Date()

  return (
    <div className="reminder-panel">
      <div className="reminder-header" onClick={() => setCollapsed(c => !c)}>
        <span className="reminder-title">
          <span className="reminder-count">{reminders.length}</span>
          任务提醒
        </span>
        <div className="reminder-header-right">
          <button
            className="reminder-dismiss-all"
            onClick={e => { e.stopPropagation(); dismissAll() }}
          >
            全清
          </button>
          <span className="reminder-chevron">{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {!collapsed && (
        <div className="reminder-list">
          {reminders.map(task => {
            const start = new Date(task.startTime)
            const diffMins = Math.round((start - now) / (1000 * 60))
            const cfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium
            const isOverdue = diffMins < 0
            const isNow = diffMins >= 0 && diffMins <= 5

            return (
              <div
                key={task.id}
                className={`reminder-item ${isNow ? 'reminder-now' : ''} ${isOverdue ? 'reminder-overdue' : ''}`}
              >
                <div className="reminder-item-row">
                  <span className="reminder-priority-tag" style={{ color: cfg.color }}>
                    [{cfg.label}]
                  </span>
                  <button className="reminder-dismiss-btn" onClick={() => dismiss(task.id)}>×</button>
                </div>
                <div className="reminder-task-name">{task.specific}</div>
                <div className="reminder-meta">
                  <span className="reminder-time">{formatTime(task.startTime)}</span>
                  <span className={`reminder-countdown ${isNow ? 'reminder-countdown-now' : ''}`}>
                    {isOverdue
                      ? `已过 ${Math.abs(diffMins)} 分钟`
                      : isNow
                      ? '>>> 现在开始'
                      : `${diffMins} 分钟后`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
