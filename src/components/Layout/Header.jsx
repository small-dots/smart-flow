import { useState, useEffect } from 'react'
import { formatFullDate, todayStr } from '../../utils/helpers'
import './Header.css'

export default function Header({ title, actions, waterLevel }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = formatFullDate(todayStr())

  return (
    <header className="page-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-center">
        {waterLevel && (
          <div className={`water-level-indicator water-level-${waterLevel.level}`}>
            <div className="water-level-bar">
              <div
                className="water-level-fill"
                style={{ width: `${waterLevel.percentage}%` }}
              />
            </div>
            <span className="water-level-text">
              {waterLevel.totalHours.toFixed(1)}h / {waterLevel.level === 'red' ? '超负荷' : waterLevel.level === 'orange' ? '高负荷' : '正常'}
            </span>
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="header-time">
          <span className="time-display">{timeStr}</span>
          <span className="date-display">{dateStr}</span>
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </header>
  )
}
