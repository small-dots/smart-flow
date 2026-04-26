import { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { toDatetimeLocal, fromDatetimeLocal, todayStr } from '../../utils/helpers'
import { IconClose, IconWarning } from '../Icons'
import './SmartTaskModal.css'

const STEPS = [
  { key: 'S', label: 'Specific', title: '明确任务', desc: '这个任务具体要做什么？' },
  { key: 'M', label: 'Measurable', title: '可量化', desc: '怎样才算完成？验收标准是什么？' },
  { key: 'R', label: 'Relevant', title: '关联目标', desc: '这个任务关联哪个目标？' },
  { key: 'T', label: 'Time-bound', title: '时间范围', desc: '什么时间开始和结束？' },
  { key: 'Review', label: 'Review', title: '确认排期', desc: '系统检查可行性' }
]

const DEFAULT_FORM = {
  specific: '',
  measurable: '',
  relevantGoalId: '',
  relevantMonthlyId: '',
  track: 'work',
  startTime: '',
  endTime: '',
  estimatedHours: 1,
  priority: 'medium',
  pScore: { relevance: 5, urgency: 5, energyLevel: 'medium' },
  tags: ''
}

export default function SmartTaskModal({ onClose, onCreated, editTask = null, goals = {} }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [achievableCheck, setAchievableCheck] = useState(null)

  const annualGoals = goals.annual || []
  const monthlyGoals = goals.monthly || []

  useEffect(() => {
    if (editTask) {
      setForm({
        specific: editTask.specific || '',
        measurable: editTask.measurable || '',
        relevantGoalId: editTask.relevantGoalId || '',
        relevantMonthlyId: editTask.relevantMonthlyId || '',
        track: editTask.track || 'work',
        startTime: editTask.startTime ? toDatetimeLocal(editTask.startTime) : '',
        endTime: editTask.endTime ? toDatetimeLocal(editTask.endTime) : '',
        estimatedHours: editTask.estimatedHours || 1,
        priority: editTask.priority || 'medium',
        pScore: editTask.pScore || { relevance: 5, urgency: 5, energyLevel: 'medium' },
        tags: (editTask.tags || []).join(', ')
      })
    } else {
      // Default to today 9:00 - 10:00
      const today = todayStr()
      setForm(f => ({
        ...f,
        startTime: `${today}T09:00`,
        endTime: `${today}T10:00`
      }))
    }
  }, [editTask])

  // Auto-calculate estimated hours from time range
  useEffect(() => {
    if (form.startTime && form.endTime) {
      const diff = (new Date(form.endTime) - new Date(form.startTime)) / 3600000
      if (diff > 0) {
        setForm(f => ({ ...f, estimatedHours: Math.round(diff * 10) / 10 }))
      }
    }
  }, [form.startTime, form.endTime])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setError(null)
  }

  function setPScoreField(key, value) {
    setForm(f => ({ ...f, pScore: { ...f.pScore, [key]: value } }))
  }

  function filteredMonthlyGoals() {
    if (!form.relevantGoalId) return monthlyGoals
    return monthlyGoals.filter(m => m.annualGoalId === form.relevantGoalId)
  }

  function validateStep() {
    if (step === 0 && !form.specific.trim()) {
      setError('请填写具体的任务内容')
      return false
    }
    if (step === 1 && !form.measurable.trim()) {
      setError('请填写验收标准')
      return false
    }
    if (step === 2 && !form.relevantGoalId) {
      setError('请选择关联的年度目标')
      return false
    }
    if (step === 3) {
      if (!form.startTime || !form.endTime) {
        setError('请设定开始和结束时间')
        return false
      }
      if (new Date(form.endTime) <= new Date(form.startTime)) {
        setError('结束时间必须晚于开始时间')
        return false
      }
    }
    return true
  }

  async function handleNext() {
    if (!validateStep()) return
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setAchievableCheck(null)

    const payload = {
      ...form,
      startTime: fromDatetimeLocal(form.startTime),
      endTime: fromDatetimeLocal(form.endTime),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    }

    try {
      if (editTask) {
        await api.updateTask(editTask.id, payload)
      } else {
        await api.createTask(payload)
      }
      onCreated?.()
      onClose()
    } catch (err) {
      if (err.achievableWarning) {
        setAchievableCheck(err)
      } else {
        setError(err.error || '提交失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForceSubmit() {
    // Force submit ignoring achievable check — not recommended but allowed
    setLoading(true)
    const payload = {
      ...form,
      startTime: fromDatetimeLocal(form.startTime),
      endTime: fromDatetimeLocal(form.endTime),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      forceAchievable: true
    }
    try {
      await api.createTask(payload)
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err.error || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = STEPS[step]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal smart-modal">
        {/* SMART step progress */}
        <div className="smart-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`smart-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => i < step && setStep(i)}
            >
              <span className="smart-step-key">{s.key}</span>
              <span className="smart-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{currentStep.title}</h2>
            <p className="modal-subtitle">{currentStep.desc}</p>
          </div>
          <button className="btn-icon" onClick={onClose}><IconClose size={12} /></button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* S: Specific */}
          {step === 0 && (
            <>
              <div className="smart-field-header">
                <div className="smart-field-letter">S</div>
                <span>Specific — 明确任务动作</span>
              </div>
              <div className="form-group">
                <label className="input-label">任务标题</label>
                <input
                  className="input input-lg"
                  placeholder="例：编写4D轨迹引擎设计方案..."
                  value={form.specific}
                  onChange={e => setField('specific', e.target.value)}
                  autoFocus
                />
                <span className="input-hint">使用动词开头，明确具体动作</span>
              </div>

              <div className="form-group">
                <label className="input-label">任务类型</label>
                <div className="track-selector">
                  <button
                    className={`track-option ${form.track === 'work' ? 'selected' : ''}`}
                    onClick={() => setField('track', 'work')}
                  >
                    <span className="track-icon"></span>
                    <div>
                      <div className="track-option-title">工作轨</div>
                      <div className="track-option-desc">职场任务、技术研究、会议</div>
                    </div>
                  </button>
                  <button
                    className={`track-option ${form.track === 'life' ? 'selected' : ''}`}
                    onClick={() => setField('track', 'life')}
                  >
                    <span className="track-icon"></span>
                    <div>
                      <div className="track-option-title">生活轨</div>
                      <div className="track-option-desc">健身、阅读、家务、社交</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="input-label">优先级</label>
                  <select className="input" value={form.priority} onChange={e => setField('priority', e.target.value)}>
                    <option value="urgent">🔴 紧急</option>
                    <option value="high">🟠 高</option>
                    <option value="medium">🟡 中</option>
                    <option value="low">⚪ 低</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">标签（逗号分隔）</label>
                  <input
                    className="input"
                    placeholder="文档, 架构, 设计..."
                    value={form.tags}
                    onChange={e => setField('tags', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* M: Measurable */}
          {step === 1 && (
            <>
              <div className="smart-field-header">
                <div className="smart-field-letter">M</div>
                <span>Measurable — 可量化的验收标准</span>
              </div>
              <div className="form-group">
                <label className="input-label">完成标准</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="例：完成10页文档并提交到代码库，通过产品评审..."
                  value={form.measurable}
                  onChange={e => setField('measurable', e.target.value)}
                  autoFocus
                />
                <span className="input-hint">必须是可以客观验证的标准，不能是"大概完成"</span>
              </div>

              <div className="smart-example">
                <div className="smart-example-title">✅ 好例子</div>
                <div>完成5个功能模块的单元测试，覆盖率达到85%</div>
                <div className="smart-example-title mt-2">❌ 不好的例子</div>
                <div>差不多把测试写完</div>
              </div>

              <div className="pscore-section">
                <label className="input-label">重要度 / 紧急度 (P-Score)</label>
                <div className="pscore-sliders">
                  <div className="pscore-slider-row">
                    <span>重要度</span>
                    <input type="range" min="1" max="10" value={form.pScore.relevance}
                      onChange={e => setPScoreField('relevance', +e.target.value)} />
                    <span className="pscore-value">{form.pScore.relevance}</span>
                  </div>
                  <div className="pscore-slider-row">
                    <span>紧急度</span>
                    <input type="range" min="1" max="10" value={form.pScore.urgency}
                      onChange={e => setPScoreField('urgency', +e.target.value)} />
                    <span className="pscore-value">{form.pScore.urgency}</span>
                  </div>
                  <div className="pscore-slider-row">
                    <span>精力消耗</span>
                    <div className="energy-selector">
                      {['low', 'medium', 'high'].map(e => (
                        <button
                          key={e}
                          className={`energy-btn ${form.pScore.energyLevel === e ? 'selected' : ''}`}
                          onClick={() => setPScoreField('energyLevel', e)}
                        >
                          {e === 'low' ? '低' : e === 'medium' ? '中' : '高'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* R: Relevant */}
          {step === 2 && (
            <>
              <div className="smart-field-header">
                <div className="smart-field-letter">R</div>
                <span>Relevant — 关联目标</span>
              </div>

              <div className="form-group">
                <label className="input-label">年度目标</label>
                {annualGoals.length === 0 ? (
                  <div className="no-goals-hint">
                    还没有年度目标。请先在"目标管理"中创建目标。
                  </div>
                ) : (
                  <div className="goal-selector">
                    {annualGoals.map(g => (
                      <button
                        key={g.id}
                        className={`goal-option ${form.relevantGoalId === g.id ? 'selected' : ''}`}
                        onClick={() => { setField('relevantGoalId', g.id); setField('relevantMonthlyId', '') }}
                        style={{ '--goal-color': g.color || 'var(--brand-indigo)' }}
                      >
                        <div className="goal-option-dot" />
                        <div>
                          <div className="goal-option-title">{g.title}</div>
                          <div className="goal-option-desc">{g.measurable}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.relevantGoalId && filteredMonthlyGoals().length > 0 && (
                <div className="form-group">
                  <label className="input-label">月度里程碑（可选）</label>
                  <select
                    className="input"
                    value={form.relevantMonthlyId}
                    onChange={e => setField('relevantMonthlyId', e.target.value)}
                  >
                    <option value="">不关联月度目标</option>
                    {filteredMonthlyGoals().map(m => (
                      <option key={m.id} value={m.id}>
                        {m.year}/{m.month}月 — {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* T: Time-bound */}
          {step === 3 && (
            <>
              <div className="smart-field-header">
                <div className="smart-field-letter">T</div>
                <span>Time-bound — 明确时间范围</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="input-label">开始时间</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.startTime}
                    onChange={e => setField('startTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">结束时间</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.endTime}
                    onChange={e => setField('endTime', e.target.value)}
                  />
                </div>
              </div>

              {form.estimatedHours > 0 && (
                <div className="time-summary">
                  <span>⏱ 预计耗时：</span>
                  <strong>{form.estimatedHours}h</strong>
                  {form.estimatedHours > 4 && (
                    <span className="time-warning">⚠ 单任务超过4小时，建议拆分</span>
                  )}
                </div>
              )}

              <div className="time-blocks-hint">
                <div className="hint-title">建议时间段</div>
                <div className="hint-blocks">
                  {[
                    { label: '深度工作', time: '09:00–11:00', desc: '高效时段' },
                    { label: '下午工作', time: '14:00–17:00', desc: '协作时段' },
                    { label: '生活任务', time: '18:30–22:00', desc: '生活时段' },
                  ].map(b => (
                    <div key={b.label} className="hint-block"
                      onClick={() => {
                        const today = todayStr()
                        const [startH, endH] = b.time.split('–')
                        setField('startTime', `${today}T${startH}`)
                        setField('endTime', `${today}T${endH}`)
                      }}
                    >
                      <span className="hint-block-time">{b.time}</span>
                      <span className="hint-block-label">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Review */}
          {step === 4 && (
            <>
              <div className="review-card">
                <div className="review-title">
                  <span className={`badge ${form.track === 'work' ? 'track-badge-work' : 'track-badge-life'}`}>
                    {form.track === 'work' ? '工作' : '生活'}
                  </span>
                  <span className="review-task-name">{form.specific}</span>
                </div>

                <div className="review-rows">
                  <div className="review-row">
                    <span className="review-label">验收标准</span>
                    <span className="review-value">{form.measurable}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">关联目标</span>
                    <span className="review-value">
                      {annualGoals.find(g => g.id === form.relevantGoalId)?.title || '—'}
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">时间安排</span>
                    <span className="review-value">
                      {form.startTime && form.endTime
                        ? `${form.startTime.split('T')[1]} — ${form.endTime.split('T')[1]}（${form.estimatedHours}h）`
                        : '—'}
                    </span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">P-Score</span>
                    <span className="review-value">
                      重要 {form.pScore.relevance} · 紧急 {form.pScore.urgency} · 精力{form.pScore.energyLevel === 'high' ? '高' : form.pScore.energyLevel === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </div>

              {achievableCheck && (
                <div className="achievable-warning">
                  <div className="warning-icon"><IconWarning size={16} /></div>
                  <div>
                    <div className="warning-title">A (Achievable) — 可能超出负荷</div>
                    <div className="warning-desc">{achievableCheck.error}</div>
                    <div className="warning-actions">
                      <button className="btn btn-ghost btn-sm" onClick={handleForceSubmit}>
                        强制排入（不推荐）
                      </button>
                      <button className="btn btn-subtle btn-sm" onClick={() => { setAchievableCheck(null); setStep(3) }}>
                        调整时间
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="modal-error">
              <IconWarning size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
              ← 上一步
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              下一步 →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '正在检查...' : (editTask ? '保存更改' : '✓ 确认排期')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
