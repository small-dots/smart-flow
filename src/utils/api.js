const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export const api = {
  // Goals
  getGoals: () => req('/goals'),
  createAnnualGoal: (body) => req('/goals/annual', { method: 'POST', body }),
  createMonthlyGoal: (body) => req('/goals/monthly', { method: 'POST', body }),
  updateAnnualGoal: (id, body) => req(`/goals/annual/${id}`, { method: 'PUT', body }),
  updateMonthlyGoal: (id, body) => req(`/goals/monthly/${id}`, { method: 'PUT', body }),
  deleteAnnualGoal: (id) => req(`/goals/annual/${id}`, { method: 'DELETE' }),
  deleteMonthlyGoal: (id) => req(`/goals/monthly/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req(`/tasks${q ? `?${q}` : ''}`)
  },
  createTask: (body) => req('/tasks', { method: 'POST', body }),
  updateTask: (id, body) => req(`/tasks/${id}`, { method: 'PUT', body }),
  deleteTask: (id) => req(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id) => req(`/tasks/${id}`, { method: 'PUT', body: { status: 'completed' } }),

  // Settings
  getSettings: () => req('/settings'),
  updateSettings: (body) => req('/settings', { method: 'PUT', body }),

  // Analytics
  getDashboard: () => req('/analytics/dashboard')
}
