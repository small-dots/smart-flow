import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { formatTime, formatDuration } from '../utils/helpers'
import Header from '../components/Layout/Header'
import SmartTaskModal from '../components/Tasks/SmartTaskModal'
import './CalendarView.css'

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 7 : d // Mon=1, Sun=7
}

// Period cut: every 28 days, reference April 16 2026
const PERIOD_REF = new Date(2026, 3, 16)

function getPeriodCutDays(year, month) {
  const days = getDaysInMonth(year, month)
  const result = []
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month - 1, d)
    const diffDays = Math.round((date - PERIOD_REF) / 86400000)
    if (diffDays % 28 === 0) result.push(d)
  }
  return result
}

export default function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editTask, setEditTask] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [td, g] = await Promise.all([api.getTasks(), api.getGoals()])
      setTasks(td.tasks)
      setGoals(g)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function navMonth(delta) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month) // 1=Mon
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const periodCutDays = getPeriodCutDays(year, month)

  // Build calendar grid
  const cells = []
  for (let i = 1; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function getDateStr(d) {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function getTasksForDay(d) {
    const ds = getDateStr(d)
    return tasks.filter(t => new Date(t.startTime).toISOString().split('T')[0] === ds)
  }

  const selectedTasks = selectedDate ? tasks.filter(t => new Date(t.startTime).toISOString().split('T')[0] === selectedDate) : []

  async function handleStatusChange(id, status) {
    await api.updateTask(id, { status })
    load()
  }

  return (
    <div className="main-content">
      <Header
        title="日历"
        actions={
          <button className="btn btn-primary" onClick={() => { setShowModal(true) }}>+ 新建任务</button>
        }
      />

      <div className="page-content calendar-page">
        <div className="calendar-layout">
          {/* Calendar */}
          <div className="calendar-main">
            {/* Month nav */}
            <div className="cal-nav">
              <button className="btn btn-ghost btn-sm" onClick={() => navMonth(-1)}>←</button>
              <span className="cal-title">{year}年 {month}月</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navMonth(1)}>→</button>
              <button className="btn btn-subtle btn-sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}>今月</button>
            </div>

            {/* Day labels */}
            <div className="cal-grid-header">
              {['周一','周二','周三','周四','周五','周六','周日'].map(d => (
                <div key={d} className="cal-day-label">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="cal-grid">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="cal-cell empty" />

                const dateStr = getDateStr(day)
                const dayTasks = getTasksForDay(day)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                const isPeriodCut = periodCutDays.includes(day)
                const workCount = dayTasks.filter(t => t.track === 'work').length
                const lifeCount = dayTasks.filter(t => t.track === 'life').length
                const totalHours = dayTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0)

                return (
                  <div
                    key={day}
                    className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${dayTasks.length > 0 ? 'has-tasks' : ''} ${isPeriodCut ? 'cal-period-cut' : ''}`}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    title={isPeriodCut ? '切期数日（每28天）' : undefined}
                  >
                    <div className="cal-day-num">{day}</div>

                    {isPeriodCut && <div className="cal-period-badge">切期</div>}

                    {dayTasks.length > 0 && (
                      <div className="cal-task-dots">
                        {workCount > 0 && <span className="cal-dot cal-dot-work" title={`${workCount}个工作任务`} />}
                        {lifeCount > 0 && <span className="cal-dot cal-dot-life" title={`${lifeCount}个生活任务`} />}
                      </div>
                    )}

                    {dayTasks.length > 0 && (
                      <div className="cal-task-count">{dayTasks.length}</div>
                    )}

                    {totalHours >= 6 && (
                      <div className={`cal-water-dot ${totalHours >= 8 ? 'red' : 'orange'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="cal-detail">
            {selectedDate ? (
              <>
                <div className="cal-detail-header">
                  <span className="cal-detail-date">{selectedDate}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ 添加</button>
                </div>
                {periodCutDays.includes(parseInt(selectedDate.split('-')[2])) && (
                  <div className="cal-period-cut-notice">
                    <span className="cal-period-cut-icon">[CUT]</span>
                    切期数日 — 每28天一次
                  </div>
                )}
                <div className="cal-detail-tasks">
                  {selectedTasks.length === 0 ? (
                    <div className="empty-state">
                      <p>当天没有任务</p>
                    </div>
                  ) : (
                    selectedTasks
                      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                      .map(task => (
                        <div key={task.id} className={`cal-task-item track-${task.track}`}>
                          <div className="cal-task-time">
                            {formatTime(task.startTime)}
                          </div>
                          <div className="cal-task-info">
                            <div className="cal-task-title">{task.specific}</div>
                            <div className="cal-task-dur">{formatDuration(task.estimatedHours)}</div>
                          </div>
                          <button
                            className={`cal-task-check ${task.status === 'completed' ? 'done' : ''}`}
                            onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                          >
                            {task.status === 'completed' ? '✓' : '○'}
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>点击日期查看任务</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <SmartTaskModal
          editTask={editTask}
          goals={goals}
          onClose={() => { setShowModal(false); setEditTask(null) }}
          onCreated={load}
        />
      )}
    </div>
  )
}
