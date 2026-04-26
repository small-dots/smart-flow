import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { formatDuration, getPScoreColor, getWaterLevelClass, formatDate, getDayCN } from '../utils/helpers'
import Header from '../components/Layout/Header'
import TaskCard from '../components/Tasks/TaskCard'
import SmartTaskModal from '../components/Tasks/SmartTaskModal'
import { useToast } from '../components/UI/ToastManager'
import './Dashboard.css'

export default function Dashboard() {
  const { show, confirm } = useToast()
  const [data, setData] = useState(null)
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)

  async function load() {
    try {
      const [dash, goalsData] = await Promise.all([api.getDashboard(), api.getGoals()])
      setData(dash)
      setGoals(goalsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleComplete(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await api.updateTask(task.id, { status: newStatus })
    load()
  }

  async function handleDelete(id) {
    if (!(await confirm('确认删除此任务？', '此操作不可撤销'))) return
    await api.deleteTask(id)
    show('任务已删除', 'success')
    load()
  }

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  const { today, weekly, goalsCount } = data || {}
  const wl = today?.waterLevel

  return (
    <div className="main-content">
      <Header
        title="概览"
        waterLevel={wl}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + 新建任务
          </button>
        }
      />

      <div className="page-content">
        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{today?.completed}/{today?.total}</div>
            <div className="stat-label">今日完成</div>
            <div className="progress-bar mt-2">
              <div
                className="progress-fill progress-fill-green"
                style={{ width: `${today?.completionRate || 0}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: wl?.level === 'red' ? 'var(--status-red)' : wl?.level === 'orange' ? 'var(--status-orange)' : 'var(--text-primary)' }}>
              {formatDuration(wl?.totalHours || 0)}
            </div>
            <div className="stat-label">今日工时</div>
            <div className="progress-bar mt-2">
              <div
                className={`progress-fill ${getWaterLevelClass(wl?.level)}`}
                style={{ width: `${wl?.percentage || 0}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{today?.conflicts || 0}</div>
            <div className="stat-label">时间冲突</div>
            {today?.conflicts > 0 && (
              <div className="stat-warning">⚠ 存在时间冲突</div>
            )}
          </div>

          <div className="stat-card">
            <div className="stat-value">{goalsCount?.annual || 0}</div>
            <div className="stat-label">年度目标</div>
            <div className="stat-sub">{goalsCount?.monthly || 0} 个月度里程碑</div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Today's Priority Tasks */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">今日任务（P-Score 排序）</h2>
              <button className="btn btn-subtle btn-sm" onClick={() => setShowModal(true)}>+ 添加</button>
            </div>

            {today?.tasks?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◈</div>
                <p>今天还没有任务</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>创建第一个任务</button>
              </div>
            ) : (
              <div className="task-list">
                {today?.tasks?.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    goals={goals.annual}
                    onComplete={handleComplete}
                    onEdit={t => { setEditTask(t); setShowModal(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Weekly completion chart */}
          <div className="dashboard-aside">
            <div className="section-header">
              <h2 className="section-title">本周完成率</h2>
            </div>
            <div className="weekly-chart">
              {weekly?.map(day => (
                <div key={day.date} className="weekly-bar-col">
                  <div className="weekly-bar-wrapper">
                    <div
                      className="weekly-bar"
                      style={{ height: `${Math.max(day.completionRate, 4)}%` }}
                      data-tooltip={`${day.completionRate}% (${day.completed}/${day.total})`}
                    />
                  </div>
                  <span className="weekly-bar-label">{getDayCN(day.date)}</span>
                </div>
              ))}
            </div>

            {/* Goals progress */}
            <div className="section-header mt-4">
              <h2 className="section-title">目标进度</h2>
            </div>
            <div className="goals-overview">
              {goals.annual?.map(g => (
                <div key={g.id} className="goal-overview-item">
                  <div className="flex items-center justify-between mb-1">
                    <span className="goal-overview-title">{g.title}</span>
                    <span className="goal-overview-pct">{g.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${g.progress}%`, background: g.color || 'var(--brand-indigo)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
