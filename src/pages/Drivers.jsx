import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { formatDate, isLicenseExpired } from '../utils/validators';
import { Plus, Edit3, Trash2, Users, AlertTriangle } from 'lucide-react';
import './Drivers.css';

const EMPTY = { name: '', licenseNumber: '', licenseCategory: '', licenseExpiry: '', safetyScore: 100 };

export default function Drivers() {
  const [allDrivers, setAllDrivers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [groups, setGroups] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const CATEGORIES = ['Truck', 'Van', 'Bike'];

  const load = async () => {
    const data = await api.get('/drivers');
    setAllDrivers(data);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setError(''); setModalOpen(true); };
  const openEdit = (d) => { setForm({ ...d }); setEditing(d.id); setError(''); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, safetyScore: Number(form.safetyScore) };
      if (editing) { await api.put(`/drivers/${editing}`, payload); }
      else { await api.post('/drivers', payload); }
      setModalOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const toggleStatus = async (d, status) => { await api.patch(`/drivers/${d.id}/status`, { status }); load(); };
  const handleDelete = async (id) => { if (!confirm('Delete this driver?')) return; await api.delete(`/drivers/${id}`); load(); };

  const [selectedCategories, setSelectedCategories] = useState([]);
  useEffect(() => {
    if (form.licenseCategory) { setSelectedCategories(form.licenseCategory.split(',').map(c => c.trim()).filter(Boolean)); }
    else { setSelectedCategories([]); }
  }, [form.licenseCategory]);

  const toggleCategory = (cat) => {
    const newCats = selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat];
    setSelectedCategories(newCats);
    setForm(p => ({ ...p, licenseCategory: newCats.join(',') }));
  };

  const renderCard = (d) => {
    const expired = isLicenseExpired(d.licenseExpiry);
    const totalTrips = d.tripsCompleted + d.tripsCancelled;
    const completionRate = totalTrips > 0 ? Math.round((d.tripsCompleted / totalTrips) * 100) : 0;

    return (
      <div key={d.id} className={`driver-card glass-panel ${expired ? 'expired-card' : ''}`}>
        <div className="driver-header">
          <div className="driver-avatar">{d.name.split(' ').map(n => n[0]).join('')}</div>
          <div className="driver-info"><h3>{d.name}</h3><StatusPill status={d.status} /></div>
          <div className="driver-actions-top">
            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(d)}><Edit3 size={14} /></button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}><Trash2 size={14} /></button>
          </div>
        </div>
        {expired && <div className="alert alert-error" style={{margin:'10px 0',padding:'8px 12px'}}><AlertTriangle size={14} /> License Expired</div>}
        <div className="driver-stats">
          <div className="stat"><span className="stat-label">License</span><span className="stat-value">{d.licenseNumber}</span></div>
          <div className="stat"><span className="stat-label">Category</span><span className="stat-value">{d.licenseCategory}</span></div>
          <div className="stat"><span className="stat-label">Expiry</span><span className={`stat-value ${expired ? 'text-danger' : ''}`}>{formatDate(d.licenseExpiry)}</span></div>
          <div className="stat">
            <span className="stat-label">Safety Score</span>
            <div className="score-bar"><div className="score-fill" style={{ width: `${d.safetyScore}%`, background: d.safetyScore >= 80 ? 'var(--success)' : d.safetyScore >= 50 ? 'var(--warning)' : 'var(--danger)' }} /></div>
            <span className="stat-value">{d.safetyScore}%</span>
          </div>
          <div className="stat"><span className="stat-label">Trips</span><span className="stat-value">{d.tripsCompleted} done, {d.tripsCancelled} cancelled</span></div>
          <div className="stat"><span className="stat-label">Completion</span><span className="stat-value">{completionRate}%</span></div>
        </div>
        <div className="driver-status-actions">
          {d.status !== 'On Duty' && d.status !== 'Suspended' && <button className="btn btn-sm btn-success" onClick={() => toggleStatus(d, 'On Duty')}>Set On Duty</button>}
          {d.status !== 'Off Duty' && <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(d, 'Off Duty')}>Set Off Duty</button>}
          {d.status !== 'Suspended' && <button className="btn btn-sm btn-danger" onClick={() => toggleStatus(d, 'Suspended')}>Suspend</button>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Driver Performance & Safety</h1><p className="subtitle">Compliance management and performance tracking</p></div>
        <button className="btn btn-primary" onClick={openCreate} id="add-driver-btn"><Plus size={16} /> Add Driver</button>
      </div>

      <SearchBar
        data={allDrivers}
        onResult={(filtered, grps) => { setDrivers(filtered); setGroups(grps); }}
        searchKeys={['name', 'licenseNumber', 'licenseCategory']}
        sortOptions={[
          { key: 'name', label: 'Name' },
          { key: 'safetyScore', label: 'Safety Score' },
          { key: 'licenseExpiry', label: 'License Expiry' },
          { key: 'tripsCompleted', label: 'Trips Completed' },
        ]}
        filterOptions={[
          { key: 'status', label: 'Status', values: ['On Duty', 'Off Duty', 'Suspended'] },
        ]}
        groupByOptions={[
          { key: 'status', label: 'Status' },
          { key: 'licenseCategory', label: 'License Category' },
        ]}
      />

      {groups ? (
        Object.entries(groups).map(([key, items]) => (
          <div key={key}>
            <div className="group-header"><h3>{key}</h3><span className="group-count">{items.length}</span></div>
            <div className="drivers-grid">{items.map(renderCard)}</div>
          </div>
        ))
      ) : (
        <div className="drivers-grid">
          {drivers.map(renderCard)}
          {!drivers.length && <div className="empty-state"><Users size={40} /><h3>No drivers found</h3></div>}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add New Driver'}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group"><label>Full Name</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required /></div>
          <div className="form-row">
            <div className="form-group"><label>License Number</label><input className="form-input" value={form.licenseNumber} onChange={e => setForm(p => ({...p, licenseNumber: e.target.value}))} required /></div>
            <div className="form-group"><label>License Expiry</label><input type="date" className="form-input" value={form.licenseExpiry} onChange={e => setForm(p => ({...p, licenseExpiry: e.target.value}))} required /></div>
          </div>
          <div className="form-group">
            <label>License Categories</label>
            <div className="category-toggles">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" className={`cat-toggle ${selectedCategories.includes(cat) ? 'active' : ''}`} onClick={() => toggleCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="form-group"><label>Safety Score</label><input type="number" className="form-input" value={form.safetyScore} onChange={e => setForm(p => ({...p, safetyScore: e.target.value}))} min="0" max="100" /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Driver'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
