import { NavLink } from 'react-router-dom'
import {
  IconDashboard, IconCalendarDay, IconTarget,
  IconGantt, IconKanban, IconCalendar, IconSettings, IconLogo
} from '../Icons'
import './Sidebar.css'

const NAV_ITEMS = [
  { path: '/', label: '概览', Icon: IconDashboard, exact: true },
  { path: '/daily', label: '今日计划', Icon: IconCalendarDay },
  { path: '/goals', label: '目标管理', Icon: IconTarget },
  { path: '/gantt', label: '甘特图', Icon: IconGantt },
  { path: '/kanban', label: '看板', Icon: IconKanban },
  { path: '/calendar', label: '日历', Icon: IconCalendar },
]

const BOTTOM_ITEMS = [
  { path: '/settings', label: '设置', Icon: IconSettings }
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <IconLogo size={18} />
        </div>
        <span className="logo-text">SMART<span className="logo-accent"> Flow</span></span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-label">// NAV</span>
          {NAV_ITEMS.map(({ path, label, Icon, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon size={15} /></span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-bottom">
        {BOTTOM_ITEMS.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><Icon size={15} /></span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
        <div className="sidebar-version">// v1.0.0</div>
      </div>
    </aside>
  )
}
