import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Truck, Route, Wrench, Fuel, Users, BarChart3,
  LogOut, Menu, X, Shield
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

const navItems = [
  { to: '/',            icon: <LayoutDashboard size={20} />, label: 'Command Center' },
  { to: '/vehicles',    icon: <Truck size={20} />,           label: 'Vehicle Registry' },
  { to: '/trips',       icon: <Route size={20} />,           label: 'Trip Dispatcher' },
  { to: '/maintenance', icon: <Wrench size={20} />,          label: 'Maintenance' },
  { to: '/expenses',    icon: <Fuel size={20} />,            label: 'Expenses & Fuel' },
  { to: '/drivers',     icon: <Users size={20} />,           label: 'Driver Profiles' },
  { to: '/analytics',   icon: <BarChart3 size={20} />,       label: 'Analytics' },
];

const roleBadgeColors = {
  manager: '#6366f1',
  dispatcher: '#3b82f6',
  safety_officer: '#f59e0b',
  analyst: '#10b981',
};

export default function Layout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          {!collapsed && (
            <div className="brand">
              <Shield size={28} className="brand-icon" />
              <span className="brand-text">FleetFlow</span>
            </div>
          )}
          <button className="btn-icon collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="user-info">
              <div className="user-avatar">{user.name?.[0]}</div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge" style={{ color: roleBadgeColors[user.role] }}>
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
          <button className="btn-icon logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="page-container page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
