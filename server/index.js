import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

// In Vercel, /var/task is read-only; use /tmp for writable storage
// Note: /tmp data does NOT persist across cold starts
const IS_VERCEL = !!process.env.VERCEL
const SEED_DIR = join(__dirname, 'data')
const DATA_DIR = IS_VERCEL ? '/tmp/smart-flow-data' : SEED_DIR

if (IS_VERCEL) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  for (const file of ['tasks.json', 'goals.json', 'settings.json']) {
    const dest = join(DATA_DIR, file)
    if (!existsSync(dest)) copyFileSync(join(SEED_DIR, file), dest)
  }
}

app.use(cors())
app.use(express.json())

// --- Helpers ---
function readJSON(file) {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'))
}

function writeJSON(file, data) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8')
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// Calculate P-Score for a task
function calculatePScore(task, settings) {
  const { pScore, startTime, endTime } = task
  if (!pScore) return 0

  const relevance = pScore.relevance || 5
  const urgency = pScore.urgency || 5
  const energyMultiplier = { high: 1.2, medium: 1.0, low: 0.8 }[pScore.energyLevel] || 1.0

  // Deadline urgency boost
  const now = new Date()
  const deadline = new Date(endTime)
  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60)
  const urgencyBoost = hoursUntilDeadline < 2 ? 2 : hoursUntilDeadline < 6 ? 1.5 : 1

  return Math.round(((relevance * 0.4 + urgency * 0.6) * energyMultiplier * urgencyBoost) * 10) / 10
}

// Detect time conflicts
function detectConflicts(tasks) {
  const sorted = [...tasks].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  const conflicts = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (new Date(a.endTime) > new Date(b.startTime) && a.status !== 'completed' && b.status !== 'completed') {
      conflicts.push({ taskA: a.id, taskB: b.id })
    }
  }
  return conflicts
}

// Calculate daily water level
function calcWaterLevel(tasks, targetDate, settings) {
  const dateStr = typeof targetDate === 'string' ? targetDate.slice(0, 10) : new Date(targetDate).toISOString().slice(0, 10)
  const dayTasks = tasks.filter(t => t.startTime.slice(0, 10) === dateStr && t.status !== 'cancelled')

  const totalHours = dayTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
  const maxHours = settings.maxDailyWorkHours || 8
  const warnHours = settings.warningThresholdHours || 6

  return {
    totalHours,
    percentage: Math.min(Math.round((totalHours / maxHours) * 100), 100),
    level: totalHours >= maxHours ? 'red' : totalHours >= warnHours ? 'orange' : 'normal',
    taskCount: dayTasks.length
  }
}

// =====================
// GOALS ROUTES
// =====================

// GET all goals
app.get('/api/goals', (req, res) => {
  const data = readJSON('goals.json')
  res.json(data)
})

// POST create annual goal
app.post('/api/goals/annual', (req, res) => {
  const data = readJSON('goals.json')
  const goal = {
    id: generateId('annual'),
    year: req.body.year || new Date().getFullYear(),
    title: req.body.title,
    measurable: req.body.measurable,
    description: req.body.description || '',
    progress: 0,
    color: req.body.color || '#5e6ad2',
    createdAt: new Date().toISOString()
  }
  data.annual.push(goal)
  writeJSON('goals.json', data)
  res.status(201).json(goal)
})

// POST create monthly milestone
app.post('/api/goals/monthly', (req, res) => {
  const data = readJSON('goals.json')
  const milestone = {
    id: generateId('monthly'),
    year: req.body.year || new Date().getFullYear(),
    month: req.body.month || new Date().getMonth() + 1,
    annualGoalId: req.body.annualGoalId,
    title: req.body.title,
    measurable: req.body.measurable,
    progress: 0,
    createdAt: new Date().toISOString()
  }
  data.monthly.push(milestone)
  writeJSON('goals.json', data)
  res.status(201).json(milestone)
})

// PUT update annual goal
app.put('/api/goals/annual/:id', (req, res) => {
  const data = readJSON('goals.json')
  const idx = data.annual.findIndex(g => g.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Goal not found' })
  data.annual[idx] = { ...data.annual[idx], ...req.body, id: req.params.id }
  writeJSON('goals.json', data)
  res.json(data.annual[idx])
})

// PUT update monthly milestone
app.put('/api/goals/monthly/:id', (req, res) => {
  const data = readJSON('goals.json')
  const idx = data.monthly.findIndex(g => g.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Milestone not found' })
  data.monthly[idx] = { ...data.monthly[idx], ...req.body, id: req.params.id }
  writeJSON('goals.json', data)
  res.json(data.monthly[idx])
})

// DELETE annual goal
app.delete('/api/goals/annual/:id', (req, res) => {
  const data = readJSON('goals.json')
  data.annual = data.annual.filter(g => g.id !== req.params.id)
  writeJSON('goals.json', data)
  res.json({ success: true })
})

// DELETE monthly milestone
app.delete('/api/goals/monthly/:id', (req, res) => {
  const data = readJSON('goals.json')
  data.monthly = data.monthly.filter(g => g.id !== req.params.id)
  writeJSON('goals.json', data)
  res.json({ success: true })
})

// =====================
// TASKS ROUTES
// =====================

// GET all tasks (with optional date filter)
app.get('/api/tasks', (req, res) => {
  const { date, status, track } = req.query
  const data = readJSON('tasks.json')
  const settings = readJSON('settings.json')
  let tasks = data.tasks

  if (date) {
    tasks = tasks.filter(t => t.startTime.slice(0, 10) === date)
  }

  if (status) tasks = tasks.filter(t => t.status === status)
  if (track) tasks = tasks.filter(t => t.track === track)

  // Add computed pScoreValue
  tasks = tasks.map(t => ({
    ...t,
    pScoreValue: calculatePScore(t, settings)
  }))

  const conflicts = detectConflicts(tasks)
  const waterLevel = date ? calcWaterLevel(tasks, date, settings) : null

  res.json({ tasks, conflicts, waterLevel })
})

// POST create task (SMART validation)
app.post('/api/tasks', (req, res) => {
  const data = readJSON('tasks.json')
  const settings = readJSON('settings.json')

  const { specific, measurable, relevantGoalId, startTime, endTime, estimatedHours, track } = req.body

  // SMART validation
  if (!specific) return res.status(400).json({ error: 'S (Specific): 任务动作不能为空' })
  if (!measurable) return res.status(400).json({ error: 'M (Measurable): 验收标准不能为空' })
  if (!relevantGoalId) return res.status(400).json({ error: 'R (Relevant): 必须关联一个目标' })
  if (!startTime || !endTime) return res.status(400).json({ error: 'T (Time-bound): 必须设定开始和结束时间' })

  // A (Achievable): Check daily capacity (work track only)
  const dateStr = startTime.slice(0, 10)
  const dayTasks = data.tasks.filter(t =>
    t.startTime.slice(0, 10) === dateStr &&
    t.status !== 'cancelled' &&
    t.track === (track || 'work')
  )
  const existingHours = dayTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
  const newHours = estimatedHours || 0

  if (existingHours + newHours > settings.maxDailyWorkHours && !req.body.forceAchievable) {
    return res.status(400).json({
      error: `A (Achievable): 今日已排 ${existingHours}h，新增 ${newHours}h 将超过每日上限 ${settings.maxDailyWorkHours}h`,
      achievableWarning: true,
      currentHours: existingHours,
      requestedHours: newHours
    })
  }

  const task = {
    id: generateId('task'),
    track: track || 'work',
    specific,
    measurable,
    relevantGoalId,
    relevantMonthlyId: req.body.relevantMonthlyId || null,
    startTime,
    endTime,
    estimatedHours: newHours,
    actualHours: null,
    status: 'pending',
    priority: req.body.priority || 'medium',
    pScore: req.body.pScore || { relevance: 5, urgency: 5, energyLevel: 'medium' },
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
    completedAt: null
  }

  data.tasks.push(task)
  writeJSON('tasks.json', data)
  res.status(201).json({ ...task, pScoreValue: calculatePScore(task, settings) })
})

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  const data = readJSON('tasks.json')
  const idx = data.tasks.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Task not found' })

  const updated = { ...data.tasks[idx], ...req.body, id: req.params.id }

  // Auto-set completedAt
  if (req.body.status === 'completed' && !data.tasks[idx].completedAt) {
    updated.completedAt = new Date().toISOString()
  }

  data.tasks[idx] = updated
  writeJSON('tasks.json', data)
  res.json(updated)
})

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  const data = readJSON('tasks.json')
  data.tasks = data.tasks.filter(t => t.id !== req.params.id)
  writeJSON('tasks.json', data)
  res.json({ success: true })
})

// =====================
// SETTINGS ROUTES
// =====================

app.get('/api/settings', (req, res) => {
  res.json(readJSON('settings.json'))
})

app.put('/api/settings', (req, res) => {
  const current = readJSON('settings.json')
  const updated = { ...current, ...req.body }
  writeJSON('settings.json', updated)
  res.json(updated)
})

// =====================
// ANALYTICS ROUTES
// =====================

// GET dashboard stats
app.get('/api/analytics/dashboard', (req, res) => {
  const tasksData = readJSON('tasks.json')
  const goalsData = readJSON('goals.json')
  const settings = readJSON('settings.json')

  const today = new Date().toISOString().split('T')[0]
  const tasks = tasksData.tasks

  const todayTasks = tasks.filter(t => t.startTime.slice(0, 10) === today)

  const completedToday = todayTasks.filter(t => t.status === 'completed').length
  const totalToday = todayTasks.length
  const waterLevel = calcWaterLevel(todayTasks, today, settings)
  const conflicts = detectConflicts(todayTasks.filter(t => t.status !== 'completed'))

  // Weekly stats (last 7 days)
  const weeklyStats = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayTasks = tasks.filter(t => t.startTime.slice(0, 10) === dateStr)
    const completed = dayTasks.filter(t => t.status === 'completed').length
    weeklyStats.push({
      date: dateStr,
      total: dayTasks.length,
      completed,
      completionRate: dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : 0
    })
  }

  res.json({
    today: {
      completed: completedToday,
      total: totalToday,
      completionRate: totalToday ? Math.round((completedToday / totalToday) * 100) : 0,
      waterLevel,
      conflicts: conflicts.length,
      tasks: todayTasks.map(t => ({
        ...t,
        pScoreValue: calculatePScore(t, settings)
      })).sort((a, b) => b.pScoreValue - a.pScoreValue)
    },
    weekly: weeklyStats,
    goalsCount: {
      annual: goalsData.annual.length,
      monthly: goalsData.monthly.length
    }
  })
})

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`SMART Flow Server running at http://localhost:${PORT}`)
  })
}

export default app
