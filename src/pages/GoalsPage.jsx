import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { getMonthName } from '../utils/helpers'
import Header from '../components/Layout/Header'
import './GoalsPage.css'

const GOAL_COLORS = ['#5e6ad2', '#27a644', '#f59e0b', '#ef4444', '#10b981', '#3b82f6']

function GoalModal({ type, onClose, onSaved, annualGoals = [], editData = null }) {
  const isMonthly = type === 'monthly'
  const now = new Date()
  const [form, setForm] = useState({
    title: editData?.title || '',
    measurable: editData?.measurable || '',
    description: editData?.description || '',
    year: editData?.year || now.getFullYear(),
    month: editData?.month || now.getMonth() + 1,
    annualGoalId: editData?.annualGoalId || '',
    color: editData?.color || GOAL_COLORS[0],
    progress: editData?.progress || 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(null) }

  async function handleSave() {
    if (!form.title.trim()) return setError('目标标题不能为空')
    if (!form.measurable.trim()) return setError('可衡量指标不能为空')
    if (isMonthly && !form.annualGoalId) return setError('请关联年度目标')

    setLoading(true)
    try {
      if (editData) {
        if (isMonthly) await api.updateMonthlyGoal(editData.id, form)
        else await api.updateAnnualGoal(editData.id, form)
      } else {
        if (isMonthly) await api.createMonthlyGoal(form)
        else await api.createAnnualGoal(form)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.error || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 590, color: 'var(--text-primary)' }}>
            {editData ? '编辑' : '创建'}{isMonthly ? '月度里程碑' : '年度目标'}
          </h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!isMonthly && (
            <div className="form-group">
              <label className="input-label">目标年份</label>
              <input type="number" className="input" value={form.year}
                onChange={e => setField('year', +e.target.value)} min="2024" max="2030" />
            </div>
          )}

          {isMonthly && (
            <div className="form-row">
              <div className="form-group">
                <label className="input-label">年度目标</label>
                <select className="input" value={form.annualGoalId}
                  onChange={e => setField('annualGoalId', e.target.value)}>
                  <option value="">-- 选择年度目标 --</option>
                  {annualGoals.map(g => (
                    <option key={g.id} value={g.id}>{g.year}年 — {g.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">月份</label>
                <select className="input" value={form.month}
                  onChange={e => setField('month', +e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="input-label">标题</label>
            <input className="input" placeholder={isMonthly ? "例：完成系统设计文档" : "例：架构师晋升"}
              value={form.title} onChange={e => setField('title', e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label className="input-label">可衡量指标 (Measurable)</label>
            <textarea className="input" rows={2}
              placeholder="例：通过公司架构师认证考核"
              value={form.measurable} onChange={e => setField('measurable', e.target.value)} />
          </div>

          {!isMonthly && (
            <div className="form-group">
              <label className="input-label">描述</label>
              <textarea className="input" rows={2}
                placeholder="详细说明这个目标的背景..."
                value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>
          )}

          {editData && (
            <div className="form-group">
              <label className="input-label">当前进度 ({form.progress}%)</label>
              <input type="range" min="0" max="100" value={form.progress}
                onChange={e => setField('progress', +e.target.value)}
                style={{ width: '100%', accentColor: 'var(--brand-indigo)' }} />
            </div>
          )}

          {!isMonthly && (
            <div className="form-group">
              <label className="input-label">标识颜色</label>
              <div className="color-picker">
                {GOAL_COLORS.map(c => (
                  <button
                    key={c}
                    className={`color-dot ${form.color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setField('color', c)}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="modal-error"><span>⚠</span> {error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('annual')
  const [editData, setEditData] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setGoals(await api.getGoals())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate(type) { setModalType(type); setEditData(null); setShowModal(true) }
  function openEdit(data, type) { setEditData(data); setModalType(type); setShowModal(true) }

  async function handleDelete(id, type) {
    if (!confirm('确认删除？')) return
    if (type === 'annual') await api.deleteAnnualGoal(id)
    else await api.deleteMonthlyGoal(id)
    load()
  }

  return (
    <div className="main-content">
      <Header title="目标管理" actions={
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => openCreate('monthly')}>+ 月度里程碑</button>
          <button className="btn btn-primary" onClick={() => openCreate('annual')}>+ 年度目标</button>
        </div>
      } />

      <div className="page-content">
        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" /></div>
        ) : (
          goals.annual.map(annual => {
            const monthlyForGoal = goals.monthly.filter(m => m.annualGoalId === annual.id)
            return (
              <div key={annual.id} className="annual-goal-section">
                {/* Annual Goal Card */}
                <div className="annual-goal-card" style={{ '--goal-color': annual.color }}>
                  <div className="annual-goal-header">
                    <div className="annual-goal-color-bar" />
                    <div className="annual-goal-info">
                      <div className="annual-goal-year">{annual.year}年</div>
                      <div className="annual-goal-title">{annual.title}</div>
                      <div className="annual-goal-measurable">{annual.measurable}</div>
                    </div>
                    <div className="annual-goal-right">
                      <div className="annual-goal-progress">
                        <span className="progress-pct">{annual.progress}%</span>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-fill" style={{ width: `${annual.progress}%`, background: annual.color }} />
                        </div>
                      </div>
                      <div className="goal-actions">
                        <button className="btn btn-subtle btn-sm" onClick={() => openEdit(annual, 'annual')}>编辑</button>
                        <button className="btn btn-subtle btn-sm" onClick={() => handleDelete(annual.id, 'annual')}>删除</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly milestones */}
                <div className="monthly-grid">
                  {monthlyForGoal.length === 0 ? (
                    <div className="empty-monthly">
                      <button className="btn btn-ghost btn-sm" onClick={() => openCreate('monthly')}>
                        + 添加月度里程碑
                      </button>
                    </div>
                  ) : (
                    monthlyForGoal.map(m => (
                      <div key={m.id} className="monthly-card">
                        <div className="monthly-card-top">
                          <span className="monthly-month">{m.year}/{getMonthName(m.month)}</span>
                          <div className="goal-actions">
                            <button className="btn btn-subtle btn-sm" onClick={() => openEdit(m, 'monthly')}>编辑</button>
                            <button className="btn btn-subtle btn-sm" onClick={() => handleDelete(m.id, 'monthly')}>删除</button>
                          </div>
                        </div>
                        <div className="monthly-title">{m.title}</div>
                        <div className="monthly-measurable">{m.measurable}</div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="progress-bar flex-1">
                            <div className="progress-fill progress-fill-brand" style={{ width: `${m.progress}%` }} />
                          </div>
                          <span className="monthly-pct">{m.progress}%</span>
                        </div>
                      </div>
                    ))
                  )}
                  <button className="add-monthly-btn" onClick={() => openCreate('monthly')}>
                    <span>+</span> 添加里程碑
                  </button>
                </div>
              </div>
            )
          })
        )}

        {goals.annual.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">◎</div>
            <p>还没有年度目标</p>
            <p className="text-caption text-muted">设定目标，让每一天的工作都有意义</p>
            <button className="btn btn-primary" onClick={() => openCreate('annual')}>创建第一个年度目标</button>
          </div>
        )}
      </div>

      {showModal && (
        <GoalModal
          type={modalType}
          annualGoals={goals.annual}
          editData={editData}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
