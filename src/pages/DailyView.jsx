import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { todayStr, formatTime, formatDuration, getTrackConfig } from '../utils/helpers'
import Header from '../components/Layout/Header'
import TaskCard from '../components/Tasks/TaskCard'
import SmartTaskModal from '../components/Tasks/SmartTaskModal'
import './DailyView.css'

// Hours to show in timeline (6am - 11pm)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

function TimelineSlot({ hour, tasks, goals, onComplete, onEdit, onDelete }) {
  const hourStr = String(hour).padStart(2, '0') + ':00'
  const nextHourStr = String(hour + 1).padStart(2, '0') + ':00'

  const slotTasks = tasks.filter(t => {
    const h = new Date(t.startTime).getHours()
    return h === hour
  })

  const isCurrentHour = new Date().getHours() === hour

  return (
    <div className={`timeline-slot ${isCurrentHour ? 'current-hour' : ''}`}>
      <div className="timeline-time">{hourStr}</div>
      <div className="timeline-content">
        {slotTasks.map(task => (
          <div key={task.id} className={`timeline-task track-${task.track}`}>
            <div className="timeline-task-inner">
              <span className="timeline-task-title">{task.specific}</span>
              <span className="timeline-task-time">
                {formatTime(task.startTime)} – {formatTime(task.endTime)}
              </span>
            </div>
          </div>
        ))}
        {isCurrentHour && <div className="current-time-line" style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }} />}
      </div>
    </div>
  )
}

export default function DailyView() {
  const [date, setDate] = useState(todayStr())
  const [tasksData, setTasksData] = useState({ tasks: [], conflicts: [], waterLevel: null })
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'timeline'

  async function load() {
    setLoading(true)
    try {
      const [td, g] = await Promise.all([
        api.getTasks({ date }),
        api.getGoals()
      ])
      setTasksData(td)
      setGoals(g)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [date])

  async function handleComplete(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await api.updateTask(task.id, { status: newStatus })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('确认删除此任务？')) return
    await api.deleteTask(id)
    load()
  }

  const workTasks = tasksData.tasks.filter(t => t.track === 'work')
  const lifeTasks = tasksData.tasks.filter(t => t.track === 'life')
  const wl = tasksData.waterLevel

  const conflictTaskIds = new Set(
    tasksData.conflicts.flatMap(c => [c.taskA, c.taskB])
  )

  return (
    <div className="main-content">
      <Header
        title="今日计划"
        waterLevel={wl}
        actions={
          <>
            <div className="view-toggle">
              <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>列表</button>
              <button className={`view-toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`} onClick={() => setViewMode('timeline')}>时间轴</button>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 新建任务</button>
          </>
        }
      />

      <div className="page-content">
        {/* Date navigator */}
        <div className="date-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0])
          }}>← 前一天</button>

          <div className="date-nav-center">
            <input type="date" className="date-picker" value={date} onChange={e => setDate(e.target.value)} />
            {date === todayStr() && <span className="today-badge">今天</span>}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => {
            const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0])
          }}>后一天 →</button>
        </div>

        {/* Conflict warnings */}
        {tasksData.conflicts.length > 0 && (
          <div className="conflict-banner">
            <span>⚠ 检测到 {tasksData.conflicts.length} 个时间冲突</span>
            <span className="conflict-detail">
              {tasksData.conflicts.map(c => {
                const ta = tasksData.tasks.find(t => t.id === c.taskA)
                const tb = tasksData.tasks.find(t => t.id === c.taskB)
                return ta && tb ? `"${ta.specific}" 与 "${tb.specific}"` : ''
              }).join('；')}
            </span>
          </div>
        )}

        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" /></div>
        ) : viewMode === 'timeline' ? (
          /* Timeline view */
          <div className="timeline-view">
            {HOURS.map(h => (
              <TimelineSlot
                key={h}
                hour={h}
                tasks={tasksData.tasks}
                goals={goals.annual}
                onComplete={handleComplete}
                onEdit={t => { setEditTask(t); setShowModal(true) }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          /* Dual-track list view */
          <div className="dual-track">
            {/* Work Track */}
            <div className="track-column">
              <div className="track-header track-header-work">
                <div className="track-header-dot" />
                <span className="track-header-title">工作轨 (Work Track)</span>
                <span className="track-header-count">{workTasks.length} 个任务</span>
                <span className="track-header-hours">
                  {formatDuration(workTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0))}
                </span>
              </div>
              <div className="track-tasks">
                {workTasks.length === 0 ? (
                  <div className="empty-state">
                    <p>今天没有工作任务</p>
                  </div>
                ) : (
                  workTasks
                    .sort((a, b) => (b.pScoreValue || 0) - (a.pScoreValue || 0))
                    .map(task => (
                      <div key={task.id} className={conflictTaskIds.has(task.id) ? 'task-conflict-wrapper' : ''}>
                        {conflictTaskIds.has(task.id) && (
                          <div className="conflict-marker">⚠ 时间冲突</div>
                        )}
                        <TaskCard
                          task={task}
                          goals={goals.annual}
                          onComplete={handleComplete}
                          onEdit={t => { setEditTask(t); setShowModal(true) }}
                          onDelete={handleDelete}
                        />
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Life Track */}
            <div className="track-column">
              <div className="track-header track-header-life">
                <div className="track-header-dot" />
                <span className="track-header-title">生活轨 (Life Track)</span>
                <span className="track-header-count">{lifeTasks.length} 个任务</span>
                <span className="track-header-hours">
                  {formatDuration(lifeTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0))}
                </span>
              </div>
              <div className="track-tasks">
                {lifeTasks.length === 0 ? (
                  <div className="empty-state">
                    <p>今天没有生活任务</p>
                  </div>
                ) : (
                  lifeTasks
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                    .map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        goals={goals.annual}
                        onComplete={handleComplete}
                        onEdit={t => { setEditTask(t); setShowModal(true) }}
                        onDelete={handleDelete}
                      />
                    ))
                )}
              </div>
            </div>
          </div>
        )}
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
