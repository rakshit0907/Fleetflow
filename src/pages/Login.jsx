import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { Shield, Mail, Lock, Eye, EyeOff, ChevronRight, User, UserPlus } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('dispatcher');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { name, email, password, role });
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role) => {
    const emails = {
      manager: 'manager@fleetflow.com',
      dispatcher: 'dispatch@fleetflow.com',
      safety_officer: 'safety@fleetflow.com',
      analyst: 'analyst@fleetflow.com',
    };
    setEmail(emails[role]);
    setPassword('admin123');
    try {
      const data = await api.post('/auth/login', { email: emails[role], password: 'admin123' });
      login(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-glow glow-1" />
        <div className="login-glow glow-2" />
        <div className="login-glow glow-3" />
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={40} />
          </div>
          <h1>FleetFlow</h1>
          <p>Fleet & Logistics Management System</p>
        </div>

        {/* Mode Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
            <User size={15} /> Sign In
          </button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
            <UserPlus size={15} /> Register
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input type="email" className="form-input input-with-icon" placeholder="Enter your email"
                  value={email} onChange={e => setEmail(e.target.value)} required id="login-email" />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} className="form-input input-with-icon" placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required id="login-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading} id="login-submit">
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input type="text" className="form-input input-with-icon" placeholder="Enter your name"
                  value={name} onChange={e => setName(e.target.value)} required id="register-name" />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input type="email" className="form-input input-with-icon" placeholder="Enter your email"
                  value={email} onChange={e => setEmail(e.target.value)} required id="register-email" />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} className="form-input input-with-icon" placeholder="Min 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required id="register-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input type="password" className="form-input input-with-icon" placeholder="Re-enter password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required id="register-confirm" />
              </div>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)} id="register-role">
                <option value="dispatcher">Dispatcher</option>
                <option value="manager">Fleet Manager</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="analyst">Financial Analyst</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading} id="register-submit">
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <div className="quick-login">
            <span className="quick-login-label">Quick Login As</span>
            <div className="quick-login-grid">
              <button onClick={() => quickLogin('manager')} className="quick-btn" id="quick-login-manager">
                <span className="quick-dot" style={{ background: '#6366f1' }} />Manager
              </button>
              <button onClick={() => quickLogin('dispatcher')} className="quick-btn" id="quick-login-dispatcher">
                <span className="quick-dot" style={{ background: '#3b82f6' }} />Dispatcher
              </button>
              <button onClick={() => quickLogin('safety_officer')} className="quick-btn" id="quick-login-safety">
                <span className="quick-dot" style={{ background: '#f59e0b' }} />Safety Officer
              </button>
              <button onClick={() => quickLogin('analyst')} className="quick-btn" id="quick-login-analyst">
                <span className="quick-dot" style={{ background: '#10b981' }} />Analyst
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
