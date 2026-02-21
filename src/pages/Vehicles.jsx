import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { formatCurrency } from '../utils/validators';
import { Plus, Edit3, Trash2, Ban, Truck } from 'lucide-react';
import './Vehicles.css';

const EMPTY = { name: '', model: '', plate: '', type: 'Van', maxCapacity: '', odometer: 0, acquisitionCost: '' };

export default function Vehicles() {
  const [allVehicles, setAllVehicles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [groups, setGroups] = useState(null);
  const [groupKey, setGroupKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const data = await api.get('/vehicles');
    setAllVehicles(data);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setError(''); setModalOpen(true); };
  const openEdit = (v) => { setForm(v); setEditing(v.id); setError(''); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/vehicles/${editing}`, form);
      } else {
        await api.post('/vehicles', { ...form, maxCapacity: Number(form.maxCapacity), odometer: Number(form.odometer || 0), acquisitionCost: Number(form.acquisitionCost || 0) });
      }
      setModalOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const toggleRetire = async (v) => {
    const newStatus = v.status === 'Retired' ? 'Available' : 'Retired';
    await api.patch(`/vehicles/${v.id}/status`, { status: newStatus });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    await api.delete(`/vehicles/${id}`);
    load();
  };

  const renderTable = (list) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Model</th>
          <th>Plate</th>
          <th>Type</th>
          <th>Capacity</th>
          <th>Odometer</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {list.map(v => (
          <tr key={v.id} style={{ opacity: v.status === 'Retired' ? 0.5 : 1 }}>
            <td style={{ fontWeight: 600 }}>{v.name}</td>
            <td>{v.model}</td>
            <td><code className="plate-code">{v.plate}</code></td>
            <td>{v.type}</td>
            <td>{v.maxCapacity.toLocaleString()} kg</td>
            <td>{v.odometer.toLocaleString()} km</td>
            <td><StatusPill status={v.status} /></td>
            <td>
              <div className="action-btns">
                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)} title="Edit"><Edit3 size={14} /></button>
                <button className="btn btn-sm btn-warning" onClick={() => toggleRetire(v)} title={v.status === 'Retired' ? 'Reactivate' : 'Retire'}>
                  <Ban size={14} />
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={8}><div className="empty-state"><Truck size={40} /><h3>No vehicles found</h3></div></td></tr>}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Registry</h1>
          <p className="subtitle">Manage fleet assets and inventory</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="add-vehicle-btn">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <SearchBar
        data={allVehicles}
        onResult={(filtered, grps, gk) => { setVehicles(filtered); setGroups(grps); setGroupKey(gk); }}
        searchKeys={['name', 'model', 'plate', 'type']}
        sortOptions={[
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'maxCapacity', label: 'Capacity' },
          { key: 'odometer', label: 'Odometer' },
          { key: 'status', label: 'Status' },
        ]}
        filterOptions={[
          { key: 'type', label: 'Type', values: ['Truck', 'Van', 'Bike'] },
          { key: 'status', label: 'Status', values: ['Available', 'On Trip', 'In Shop', 'Retired'] },
        ]}
        groupByOptions={[
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
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
        ) : renderTable(vehicles)}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Add New Vehicle'}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required /></div>
            <div className="form-group"><label>Model</label><input className="form-input" value={form.model} onChange={e => setForm(p => ({...p, model: e.target.value}))} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>License Plate</label><input className="form-input" value={form.plate} onChange={e => setForm(p => ({...p, plate: e.target.value}))} required /></div>
            <div className="form-group"><label>Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                <option value="Truck">Truck</option><option value="Van">Van</option><option value="Bike">Bike</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Max Capacity (kg)</label><input type="number" className="form-input" value={form.maxCapacity} onChange={e => setForm(p => ({...p, maxCapacity: e.target.value}))} required /></div>
            <div className="form-group"><label>Odometer (km)</label><input type="number" className="form-input" value={form.odometer} onChange={e => setForm(p => ({...p, odometer: e.target.value}))} /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Vehicle'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
