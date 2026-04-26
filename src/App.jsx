import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import DailyView from './pages/DailyView'
import GoalsPage from './pages/GoalsPage'
import GanttView from './pages/GanttView'
import KanbanView from './pages/KanbanView'
import CalendarView from './pages/CalendarView'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/daily" element={<DailyView />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/gantt" element={<GanttView />} />
        <Route path="/kanban" element={<KanbanView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}
