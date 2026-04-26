import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { getWeekDates, formatTime, formatDuration, getTrackConfig } from '../utils/helpers'
import Header from '../components/Layout/Header'
import SmartTaskModal from '../components/Tasks/SmartTaskModal'
import './GanttView.css'

const HOUR_WIDTH = 64 // px per hour
const ROW_HEIGHT = 48 // px per row
const DAY_START = 6  // 6am
const DAY_END = 23   // 11pm
const TOTAL_HOURS = DAY_END - DAY_START

function getTaskPosition(task) {
  const start = new Date(task.startTime)
  const end = new Date(task.endTime)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const left = Math.max(0, (startHour - DAY_START) * HOUR_WIDTH)
  const width = Math.max(HOUR_WIDTH * 0.3, (endHour - startHour) * HOUR_WIDTH)
  return { left, width }
}

function GanttBar({ task, rowIndex, onEdit, isConflict }) {
  const { left, width } = getTaskPosition(task)
  const trackCfg = getTrackConfig(task.track)

  return (
    <div
      className={`gantt-bar ${task.track === 'work' ? 'gantt-work' : 'gantt-life'} ${task.status === 'completed' ? 'gantt-done' : ''} ${isConflict ? 'gantt-conflict' : ''}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: `${rowIndex * ROW_HEIGHT + 8}px`
      }}
      onClick={() => onEdit?.(task)}
      title={`${task.specific} (${formatTime(task.startTime)}–${formatTime(task.endTime)})`}
    >
      <span className="gantt-bar-label">{task.specific}</span>
      {width > 80 && (
        <span className="gantt-bar-time">{formatTime(task.startTime)}</span>
      )}
    </div>
  )
}

export default function GanttView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [allTasks, setAllTasks] = useState([])
  const [goals, setGoals] = useState({ annual: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const scrollRef = useRef(null)

  const weekDates = getWeekDates(weekOffset)

  async function load() {
    setLoading(true)
    try {
      const [td, g] = await Promise.all([
        api.getTasks(),
        api.getGoals()
      ])
      setAllTasks(td.tasks)
      setConflicts(td.conflicts || [])
      setGoals(g)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours()
      const scrollX = Math.max(0, (currentHour - DAY_START - 2) * HOUR_WIDTH)
      scrollRef.current.scrollLeft = scrollX
    }
  }, [loading])

  const conflictIds = new Set(conflicts.flatMap(c => [c.taskA, c.taskB]))

  const currentHour = new Date().getHours() + new Date().getMinutes() / 60
  const nowLeft = (currentHour - DAY_START) * HOUR_WIDTH

  return (
    <div className="main-content">
      <Header
        title="甘特图"
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 新建任务</button>
        }
      />

      <div className="page-content gantt-page">
        {/* Week navigator */}
        <div className="gantt-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>← 上周</button>
          <div className="gantt-week-label">
            {weekDates[0]} ~ {weekDates[6]}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}>下周 →</button>
          <button className="btn btn-subtle btn-sm" onClick={() => setWeekOffset(0)}>本周</button>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="loading-spinner" /></div>
        ) : (
          <div className="gantt-container">
            {/* Day rows */}
            {weekDates.map((date, dayIdx) => {
              const dayTasks = allTasks.filter(t => {
                return new Date(t.startTime).toISOString().split('T')[0] === date
              })

              const isToday = date === new Date().toISOString().split('T')[0]

              return (
                <div key={date} className={`gantt-row ${isToday ? 'gantt-today' : ''}`}>
                  {/* Day label */}
                  <div className="gantt-row-label">
                    <span className="gantt-day">{['周一','周二','周三','周四','周五','周六','周日'][dayIdx]}</span>
                    <span className="gantt-date">{date.slice(5)}</span>
                  </div>

                  {/* Timeline area */}
                  <div className="gantt-timeline-wrap" ref={dayIdx === 0 ? scrollRef : null}>
                    <div className="gantt-timeline" style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px`, height: `${ROW_HEIGHT}px` }}>
                      {/* Hour grid lines */}
                      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="gantt-hour-line"
                          style={{ left: `${i * HOUR_WIDTH}px` }}
                        >
                          {i > 0 && <span className="gantt-hour-label">{DAY_START + i}:00</span>}
                        </div>
                      ))}

                      {/* Work hours shade (9-18) */}
                      <div
                        className="gantt-work-shade"
                        style={{
                          left: `${(9 - DAY_START) * HOUR_WIDTH}px`,
                          width: `${9 * HOUR_WIDTH}px`
                        }}
                      />

                      {/* Current time line */}
                      {isToday && nowLeft > 0 && nowLeft < TOTAL_HOURS * HOUR_WIDTH && (
                        <div className="gantt-now-line" style={{ left: `${nowLeft}px` }} />
                      )}

                      {/* Task bars */}
                      {dayTasks.map((task, i) => (
                        <GanttBar
                          key={task.id}
                          task={task}
                          rowIndex={0}
                          isConflict={conflictIds.has(task.id)}
                          onEdit={t => { setEditTask(t); setShowModal(true) }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Scrollable hour header */}
            <div className="gantt-hour-header-wrap">
              <div className="gantt-row-label-placeholder" />
              <div className="gantt-hour-header" ref={scrollRef}>
                <div style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px`, display: 'flex' }}>
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="gantt-header-cell" style={{ width: HOUR_WIDTH }}>
                      {DAY_START + i}:00
                    </div>
                  ))}
                </div>
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
