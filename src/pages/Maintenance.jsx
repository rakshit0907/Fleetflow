import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { formatDateTime, formatCurrency } from '../utils/validators';
import { Plus, CheckCircle2, Wrench } from 'lucide-react';
import './Maintenance.css';

export default function Maintenance() {
  const [allLogs, setAllLogs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [groups, setGroups] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', serviceType: '', cost: '', notes: '' });
  const [error, setError] = useState('');

  const load = async () => {
    const [m, v] = await Promise.all([
      api.get('/maintenance'),
      api.get('/vehicles'),
    ]);
    setAllLogs(m);
    setVehicles(v.filter(veh => veh.status !== 'On Trip' && veh.status !== 'Retired'));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/maintenance', {
        vehicleId: Number(form.vehicleId),
        serviceType: form.serviceType,
        cost: Number(form.cost || 0),
        notes: form.notes,
      });
      setModalOpen(false);
      setForm({ vehicleId: '', serviceType: '', cost: '', notes: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const completeMaint = async (id) => {
    try { await api.patch(`/maintenance/${id}/complete`); load(); } catch (err) { alert(err.message); }
  };

  const deleteMaint = async (id) => {
    if (!confirm('Delete this maintenance log?')) return;
    await api.delete(`/maintenance/${id}`);
    load();
  };

  const renderTable = (list) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th><th>Vehicle</th><th>Service Type</th><th>Cost</th><th>Notes</th><th>Status</th><th>Created</th><th>Completed</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {list.map(m => (
          <tr key={m.id}>
            <td>{m.id}</td>
            <td><span style={{fontWeight:600}}>{m.vehicleName}</span><br/><code className="plate-code">{m.vehiclePlate}</code></td>
            <td>{m.serviceType}</td>
            <td>{formatCurrency(m.cost)}</td>
            <td className="notes-cell">{m.notes || '—'}</td>
            <td><StatusPill status={m.status} /></td>
            <td>{formatDateTime(m.createdAt)}</td>
            <td>{formatDateTime(m.completedAt)}</td>
            <td>
              <div className="action-btns">
                {m.status === 'In Progress' && <button className="btn btn-sm btn-success" onClick={() => completeMaint(m.id)} title="Mark Complete"><CheckCircle2 size={14} /></button>}
                <button className="btn btn-sm btn-danger" onClick={() => deleteMaint(m.id)} title="Delete">×</button>
              </div>
            </td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={9}><div className="empty-state"><Wrench size={40} /><h3>No maintenance logs</h3></div></td></tr>}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Maintenance & Service Logs</h1><p className="subtitle">Track preventative and reactive vehicle maintenance</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setModalOpen(true); }} id="add-maintenance-btn"><Plus size={16} /> Log Service</button>
      </div>

      <SearchBar
        data={allLogs}
        onResult={(filtered, grps) => { setLogs(filtered); setGroups(grps); }}
        searchKeys={['vehicleName', 'vehiclePlate', 'serviceType', 'notes']}
        sortOptions={[
          { key: 'vehicleName', label: 'Vehicle' },
          { key: 'serviceType', label: 'Service Type' },
          { key: 'cost', label: 'Cost' },
          { key: 'createdAt', label: 'Date' },
        ]}
        filterOptions={[
          { key: 'status', label: 'Status', values: ['In Progress', 'Completed'] },
        ]}
        groupByOptions={[
          { key: 'status', label: 'Status' },
          { key: 'vehicleName', label: 'Vehicle' },
          { key: 'serviceType', label: 'Service Type' },
        ]}
      />

      <div className="data-table-wrapper">
        {groups ? (
          Object.entries(groups).map(([key, items]) => (
            <div key={key}>
              <div className="group-header"><h3>{key}</h3><span className="group-count">{items.length}</span></div>
              {renderTable(items)}
            </div>
          ))
        ) : renderTable(logs)}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log New Service">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="alert alert-warning">⚡ Adding a service log will automatically set the vehicle status to "In Shop"</div>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Vehicle</label>
            <select className="form-input" value={form.vehicleId} onChange={e => setForm(p => ({...p, vehicleId: e.target.value}))} required>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate}) — {v.status}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Service Type</label><input className="form-input" value={form.serviceType} onChange={e => setForm(p => ({...p, serviceType: e.target.value}))} required placeholder="e.g. Oil Change" /></div>
            <div className="form-group"><label>Cost (₹)</label><input type="number" className="form-input" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} placeholder="0" /></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Optional notes..." /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Log Service</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
