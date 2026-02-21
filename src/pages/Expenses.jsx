import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { formatDate, formatCurrency } from '../utils/validators';
import { Plus, Fuel, Trash2 } from 'lucide-react';
import './Expenses.css';

export default function Expenses() {
  const [allExpenses, setAllExpenses] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState(null);
  const [summary, setSummary] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', tripId: '', type: 'Fuel', liters: '', cost: '', date: '' });
  const [error, setError] = useState('');
  const [tab, setTab] = useState('records');

  const load = async () => {
    const [e, s, v, t] = await Promise.all([
      api.get('/expenses'),
      api.get('/expenses/summary'),
      api.get('/vehicles'),
      api.get('/trips?status=Completed'),
    ]);
    setAllExpenses(e);
    setSummary(s);
    setVehicles(v);
    setTrips(t);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/expenses', {
        vehicleId: Number(form.vehicleId),
        tripId: form.tripId ? Number(form.tripId) : null,
        type: form.type,
        liters: form.liters ? Number(form.liters) : null,
        cost: Number(form.cost),
        date: form.date || undefined,
      });
      setModalOpen(false);
      setForm({ vehicleId: '', tripId: '', type: 'Fuel', liters: '', cost: '', date: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const renderTable = (list) => (
    <table className="data-table">
      <thead>
        <tr><th>#</th><th>Vehicle</th><th>Type</th><th>Liters</th><th>Cost</th><th>Date</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {list.map(e => (
          <tr key={e.id}>
            <td>{e.id}</td>
            <td style={{fontWeight:600}}>{e.vehicleName}</td>
            <td><span className={`pill pill-${e.type === 'Fuel' ? 'info' : e.type === 'Toll' ? 'warning' : 'draft'}`} style={{fontSize:'0.7rem'}}>{e.type}</span></td>
            <td>{e.liters ? `${e.liters} L` : '—'}</td>
            <td style={{fontWeight:600}}>{formatCurrency(e.cost)}</td>
            <td>{formatDate(e.date)}</td>
            <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button></td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={7}><div className="empty-state"><Fuel size={40} /><h3>No expenses recorded</h3></div></td></tr>}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Expenses & Fuel Logging</h1><p className="subtitle">Track operational costs per vehicle</p></div>
        <button className="btn btn-primary" onClick={() => { setError(''); setModalOpen(true); }} id="add-expense-btn"><Plus size={16} /> Record Expense</button>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>Expense Records</button>
        <button className={`tab-btn ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>Cost Summary</button>
      </div>

      {tab === 'records' && (
        <>
          <SearchBar
            data={allExpenses}
            onResult={(filtered, grps) => { setExpenses(filtered); setGroups(grps); }}
            searchKeys={['vehicleName', 'type']}
            sortOptions={[
              { key: 'vehicleName', label: 'Vehicle' },
              { key: 'cost', label: 'Cost' },
              { key: 'type', label: 'Type' },
              { key: 'date', label: 'Date' },
            ]}
            filterOptions={[
              { key: 'type', label: 'Type', values: ['Fuel', 'Toll', 'Other'] },
            ]}
            groupByOptions={[
              { key: 'type', label: 'Type' },
              { key: 'vehicleName', label: 'Vehicle' },
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
            ) : renderTable(expenses)}
          </div>
        </>
      )}

      {tab === 'summary' && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Vehicle</th><th>Plate</th><th>Fuel Cost</th><th>Other Expenses</th><th>Maintenance Cost</th><th>Total Operational Cost</th></tr>
            </thead>
            <tbody>
              {summary.map(s => (
                <tr key={s.id}>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td><code className="plate-code">{s.plate}</code></td>
                  <td>{formatCurrency(s.fuelCost)}</td>
                  <td>{formatCurrency(s.otherCost)}</td>
                  <td>{formatCurrency(s.maintenanceCost)}</td>
                  <td style={{fontWeight:700,color:'var(--warning)'}}>{formatCurrency(s.totalOperationalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Expense">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle</label>
              <select className="form-input" value={form.vehicleId} onChange={e => setForm(p => ({...p, vehicleId: e.target.value}))} required>
                <option value="">Select vehicle...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                <option value="Fuel">Fuel</option><option value="Toll">Toll</option><option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Liters</label><input type="number" className="form-input" value={form.liters} onChange={e => setForm(p => ({...p, liters: e.target.value}))} placeholder="Optional" /></div>
            <div className="form-group"><label>Cost (₹)</label><input type="number" className="form-input" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            <div className="form-group">
              <label>Link to Trip (Optional)</label>
              <select className="form-input" value={form.tripId} onChange={e => setForm(p => ({...p, tripId: e.target.value}))}>
                <option value="">None</option>
                {trips.map(t => <option key={t.id} value={t.id}>#{t.id} {t.vehicleName}: {t.origin}→{t.destination}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
