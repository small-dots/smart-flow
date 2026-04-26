import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { formatTime, formatDuration, getTrackConfig, getPScoreColor } from '../utils/helpers'
import Header from '../components/Layout/Header'
import SmartTaskModal from '../components/Tasks/SmartTaskModal'
import './KanbanView.css'

const COLUMNS = [
  { id: 'pending', label: '待开始', color: 'var(--text-quaternary)', icon: '○' },
  { id: 'in_progress', label: '进行中', color: 'var(--status-green)', icon: '◉' },
  { id: 'completed', label: '已完成', color: 'var(--status-emerald)', icon: '✓' },
]

function KanbanCard({ task, goals, onEdit, onStatusChange }) {
  const trackCfg = getTrackConfig(task.track)
  const pColor = getPScoreColor(task.pScoreValue || 0)
  const relatedGoal = goals.find(g => g.id === task.relevantGoalId)

  return (
    <div
      className={`kanban-card track-${task.track}`}
      onClick={() => onEdit(task)}
    >
      <div className="kanban-card-header">
        <span className={`badge ${trackCfg.className}`}>{trackCfg.label}</span>
        {task.pScoreValue > 0 && (
          <span className="kanban-pscore" style={{ color: pColor }}>P{task.pScoreValue}</span>
        )}
      </div>

      <div className="kanban-card-title">{task.specific}</div>

      <div className="kanban-card-meta">
        <span className="kanban-time">
          {formatTime(task.startTime)} – {formatTime(task.endTime)}
        </span>
        <span className="kanban-duration">{formatDuration(task.estimatedHours)}</span>
      </div>

      {relatedGoal && (
        <div className="kanban-goal">
          <span className="kanban-goal-dot" style={{ background: relatedGoal.color || 'var(--brand-indigo)' }} />
          <span>{relatedGoal.title}</span>
        </div>
      )}

      <div className="kanban-card-footer" onClick={e => e.stopPropagation()}>
        {COLUMNS.filter(c => c.id !== task.status).map(col => (
          <button
            key={col.id}
            className="btn btn-subtle btn-sm kanban-move-btn"
            onClick={() => onStatusChange(task.id, col.id)}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function KanbanView() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filterTrack, setFilterTrack] = useState('all')

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

  async function handleStatusChange(id, status) {
    await api.updateTask(id, { status })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('确认删除？')) return
    await api.deleteTask(id)
    load()
  }

  const filtered = filterTrack === 'all' ? tasks : tasks.filter(t => t.track === filterTrack)

  return (
    <div className="main-content">
      <Header
        title="看板"
        actions={
          <>
            <div className="track-filter">
              {[
                { key: 'all', label: '全部' },
                { key: 'work', label: '工作轨' },
                { key: 'life', label: '生活轨' }
              ].map(f => (
                <button
                  key={f.key}
                  className={`filter-btn ${filterTrack === f.key ? 'active' : ''}`}
                  onClick={() => setFilterTrack(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 新建任务</button>
          </>
        }
      />

      <div className="page-content kanban-page">
        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" /></div>
        ) : (
          <div className="kanban-board">
            {COLUMNS.map(col => {
              const colTasks = filtered
                .filter(t => t.status === col.id)
                .sort((a, b) => (b.pScoreValue || 0) - (a.pScoreValue || 0))

              return (
                <div key={col.id} className="kanban-column">
                  <div className="kanban-column-header">
                    <span className="kanban-col-icon" style={{ color: col.color }}>{col.icon}</span>
                    <span className="kanban-col-title">{col.label}</span>
                    <span className="kanban-col-count">{colTasks.length}</span>
                  </div>

                  <div className="kanban-cards">
                    {colTasks.length === 0 ? (
                      <div className="kanban-empty">暂无任务</div>
                    ) : (
                      colTasks.map(task => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          goals={goals.annual}
                          onEdit={t => { setEditTask(t); setShowModal(true) }}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>

                  <button
                    className="kanban-add-btn"
                    onClick={() => setShowModal(true)}
                  >
                    + 添加任务
                  </button>
                </div>
              )
            })}
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
