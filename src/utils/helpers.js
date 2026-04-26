// Format time (HH:MM) from ISO string
export function formatTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Format date (MM-DD) from ISO string
export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// Format full date
export function formatFullDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Duration in minutes
export function getDurationMinutes(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000)
}

// Duration readable (e.g. 1.5h, 30m)
export function formatDuration(hours) {
  if (!hours) return '0m'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${hours.toFixed(1)}h`
}

// Today's date string
export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Week dates starting from Monday
export function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(monday.getDate() - day + 1 + offset * 7)

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// Status config
const STATUS_CONFIG = {
  pending: { label: '待开始', color: 'var(--text-quaternary)' },
  in_progress: { label: '进行中', color: 'var(--status-green)' },
  completed: { label: '已完成', color: 'var(--status-emerald)' },
  cancelled: { label: '已取消', color: 'var(--text-quaternary)' }
}

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending
}

// Priority config
const PRIORITY_CONFIG = {
  urgent: { label: '紧急', className: 'priority-urgent' },
  high: { label: '高', className: 'priority-high' },
  medium: { label: '中', className: 'priority-medium' },
  low: { label: '低', className: 'priority-low' }
}

export function getPriorityConfig(priority) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium
}

// Track config
export function getTrackConfig(track) {
  return track === 'work'
    ? { label: '工作', className: 'track-badge-work' }
    : { label: '生活', className: 'track-badge-life' }
}

// Generate local datetime string for input[type=datetime-local]
export function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Parse datetime-local to ISO
export function fromDatetimeLocal(local) {
  return new Date(local).toISOString()
}

// Water level color class
export function getWaterLevelClass(level) {
  if (level === 'red') return 'progress-fill-red'
  if (level === 'orange') return 'progress-fill-orange'
  return 'progress-fill-brand'
}

// P-Score color
export function getPScoreColor(score) {
  if (score >= 8) return 'var(--status-red)'
  if (score >= 6) return 'var(--status-orange)'
  if (score >= 4) return 'var(--accent-violet)'
  return 'var(--text-tertiary)'
}

// Chinese day name
const DAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export function getDayCN(iso) {
  return DAYS_CN[new Date(iso).getDay()]
}

// Month name
export function getMonthName(month) {
  return `${month}月`
}
