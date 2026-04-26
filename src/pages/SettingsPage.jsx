import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import Header from '../components/Layout/Header'
import './SettingsPage.css'

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  function setField(path, value) {
    setSettings(prev => {
      const next = { ...prev }
      const keys = path.split('.')
      let cur = next
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] }
        cur = cur[keys[i]]
      }
      cur[keys[keys.length - 1]] = value
      return next
    })
  }

  async function handleSave() {
    await api.updateSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  return (
    <div className="main-content">
      <Header title="设置" actions={
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      } />

      <div className="page-content">
        <div className="settings-layout">
          {/* Work Settings */}
          <div className="settings-section">
            <h2 className="settings-section-title">工作时间</h2>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">工作开始时间</div>
                  <div className="settings-label-desc">每天工作的开始时间</div>
                </div>
                <input type="time" className="input settings-input"
                  value={settings.workHours?.start || '09:00'}
                  onChange={e => setField('workHours.start', e.target.value)} />
              </div>

              <div className="settings-divider" />

              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">下班提醒时间</div>
                  <div className="settings-label-desc">系统将在此时提醒切换生活模式</div>
                </div>
                <input type="time" className="input settings-input"
                  value={settings.workEndTime || '18:30'}
                  onChange={e => setField('workEndTime', e.target.value)} />
              </div>

              <div className="settings-divider" />

              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">高效时段</div>
                  <div className="settings-label-desc">系统优先将高难度任务排在此时段</div>
                </div>
                <div className="flex gap-2 items-center">
                  <input type="time" className="input settings-input-sm"
                    value={settings.productiveHours?.start || '09:00'}
                    onChange={e => setField('productiveHours.start', e.target.value)} />
                  <span className="text-quaternary">—</span>
                  <input type="time" className="input settings-input-sm"
                    value={settings.productiveHours?.end || '11:00'}
                    onChange={e => setField('productiveHours.end', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Load Settings */}
          <div className="settings-section">
            <h2 className="settings-section-title">负荷设置</h2>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">每日工时上限</div>
                  <div className="settings-label-desc">超过此值系统将禁止新增任务 (A — Achievable)</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" className="input settings-input-sm" min="4" max="16"
                    value={settings.maxDailyWorkHours || 8}
                    onChange={e => setField('maxDailyWorkHours', +e.target.value)} />
                  <span className="text-tertiary text-caption">小时</span>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">橙色预警阈值</div>
                  <div className="settings-label-desc">超过此工时显示橙色水位预警</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" className="input settings-input-sm" min="2" max="12"
                    value={settings.warningThresholdHours || 6}
                    onChange={e => setField('warningThresholdHours', +e.target.value)} />
                  <span className="text-tertiary text-caption">小时</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pomodoro Settings */}
          <div className="settings-section">
            <h2 className="settings-section-title">番茄钟</h2>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">专注时长</div>
                  <div className="settings-label-desc">每个番茄钟的工作时长</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" className="input settings-input-sm" min="15" max="60"
                    value={settings.pomodoroMinutes || 25}
                    onChange={e => setField('pomodoroMinutes', +e.target.value)} />
                  <span className="text-tertiary text-caption">分钟</span>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-row">
                <div className="settings-label">
                  <div className="settings-label-title">休息时长</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" className="input settings-input-sm" min="3" max="20"
                    value={settings.breakMinutes || 5}
                    onChange={e => setField('breakMinutes', +e.target.value)} />
                  <span className="text-tertiary text-caption">分钟</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-section">
            <h2 className="settings-section-title">提醒设置</h2>
            <div className="settings-card">
              {[
                { key: 'workEndReminder', title: '下班提醒', desc: '18:30 提醒切换生活模式' },
                { key: 'latestStartReminder', title: '最晚开始提醒', desc: '在必须开始的时间点提醒' },
                { key: 'waterLevelWarning', title: '水位预警', desc: '工时超过阈值时变色提示' },
              ].map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <div className="settings-divider" />}
                  <div className="settings-row">
                    <div className="settings-label">
                      <div className="settings-label-title">{item.title}</div>
                      <div className="settings-label-desc">{item.desc}</div>
                    </div>
                    <button
                      className={`toggle ${settings.notifications?.[item.key] ? 'active' : ''}`}
                      onClick={() => setField(`notifications.${item.key}`, !settings.notifications?.[item.key])}
                    >
                      <div className="toggle-knob" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="settings-section">
            <h2 className="settings-section-title">关于</h2>
            <div className="settings-card">
              <div className="settings-about">
                <div className="about-logo">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="about-name">SMART Flow</div>
                  <div className="about-desc">智能排期系统 · 让每一天都有方向</div>
                  <div className="about-version">v1.0.0</div>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="smart-principles">
                <div className="principles-title">SMART 原则</div>
                {[
                  { key: 'S', label: 'Specific', desc: '具体明确的任务动作' },
                  { key: 'M', label: 'Measurable', desc: '可量化的验收标准' },
                  { key: 'A', label: 'Achievable', desc: '系统自动检查工时上限' },
                  { key: 'R', label: 'Relevant', desc: '关联年度/月度目标' },
                  { key: 'T', label: 'Time-bound', desc: '明确开始和结束时间' },
                ].map(p => (
                  <div key={p.key} className="principle-item">
                    <span className="principle-key">{p.key}</span>
                    <span className="principle-label">{p.label}</span>
                    <span className="principle-desc">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
