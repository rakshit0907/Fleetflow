import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import { formatDateTime } from '../utils/validators';
import { Plus, Play, CheckCircle2, XCircle, Route as RouteIcon } from 'lucide-react';
import './Trips.css';

const EMPTY = { vehicleId: '', driverId: '', origin: '', destination: '', cargoWeight: '' };

export default function Trips() {
  const [allTrips, setAllTrips] = useState([]);
  const [trips, setTrips] = useState([]);
  const [groups, setGroups] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [odometerEnd, setOdometerEnd] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const load = async () => {
    const [t, v, d] = await Promise.all([
      api.get('/trips'),
      api.get('/vehicles?availableOnly=true'),
      api.get('/drivers?availableOnly=true'),
    ]);
    setAllTrips(t);
    setVehicles(v);
    setDrivers(d);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setSelectedVehicle(null); setModalOpen(true); };

  const handleVehicleSelect = (vId) => {
    setForm(p => ({...p, vehicleId: vId}));
    const v = vehicles.find(v => v.id === Number(vId));
    setSelectedVehicle(v || null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', {
        vehicleId: Number(form.vehicleId),
        driverId: Number(form.driverId),
        origin: form.origin,
        destination: form.destination,
        cargoWeight: Number(form.cargoWeight),
      });
      setModalOpen(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const dispatch = async (id) => {
    try { await api.patch(`/trips/${id}/dispatch`); load(); } catch (err) { alert(err.message); }
  };

  const openComplete = (trip) => { setCompleteModal(trip); setOdometerEnd(trip.odometerStart?.toString() || ''); };

  const complete = async () => {
    try { await api.patch(`/trips/${completeModal.id}/complete`, { odometerEnd: Number(odometerEnd) }); setCompleteModal(null); load(); } catch (err) { alert(err.message); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this trip?')) return;
    try { await api.patch(`/trips/${id}/cancel`); load(); } catch (err) { alert(err.message); }
  };

  const renderTable = (list) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th><th>Vehicle</th><th>Driver</th><th>Route</th><th>Cargo</th><th>Status</th><th>Created</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {list.map(t => (
          <tr key={t.id}>
            <td>{t.id}</td>
            <td><span style={{fontWeight:600}}>{t.vehicleName}</span><br/><code className="plate-code">{t.vehiclePlate}</code></td>
            <td>{t.driverName}</td>
            <td className="route-cell">{t.origin}<span className="route-arrow">→</span>{t.destination}</td>
            <td>{t.cargoWeight} kg</td>
            <td><StatusPill status={t.status} /></td>
            <td>{formatDateTime(t.createdAt)}</td>
            <td>
              <div className="action-btns">
                {t.status === 'Draft' && <button className="btn btn-sm btn-success" onClick={() => dispatch(t.id)} title="Dispatch"><Play size={14} /></button>}
                {t.status === 'Dispatched' && <button className="btn btn-sm btn-success" onClick={() => openComplete(t)} title="Complete"><CheckCircle2 size={14} /></button>}
                {(t.status === 'Draft' || t.status === 'Dispatched') && <button className="btn btn-sm btn-danger" onClick={() => cancel(t.id)} title="Cancel"><XCircle size={14} /></button>}
              </div>
            </td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={8}><div className="empty-state"><RouteIcon size={40} /><h3>No trips found</h3></div></td></tr>}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1>Trip Dispatcher</h1><p className="subtitle">Create, dispatch, and track shipments</p></div>
        <button className="btn btn-primary" onClick={openCreate} id="create-trip-btn"><Plus size={16} /> New Trip</button>
      </div>

      <SearchBar
        data={allTrips}
        onResult={(filtered, grps) => { setTrips(filtered); setGroups(grps); }}
        searchKeys={['vehicleName', 'vehiclePlate', 'driverName', 'origin', 'destination']}
        sortOptions={[
          { key: 'id', label: 'Trip #' },
          { key: 'vehicleName', label: 'Vehicle' },
          { key: 'driverName', label: 'Driver' },
          { key: 'cargoWeight', label: 'Cargo Weight' },
          { key: 'createdAt', label: 'Date Created' },
        ]}
        filterOptions={[
          { key: 'status', label: 'Status', values: ['Draft', 'Dispatched', 'Completed', 'Cancelled'] },
        ]}
        groupByOptions={[
          { key: 'status', label: 'Status' },
          { key: 'vehicleName', label: 'Vehicle' },
          { key: 'driverName', label: 'Driver' },
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
        ) : renderTable(trips)}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Trip">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle (Available Only)</label>
              <select className="form-input" value={form.vehicleId} onChange={e => handleVehicleSelect(e.target.value)} required>
                <option value="">Select vehicle...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate}) — {v.maxCapacity}kg max</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Driver (Available Only)</label>
              <select className="form-input" value={form.driverId} onChange={e => setForm(p => ({...p, driverId: e.target.value}))} required>
                <option value="">Select driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.licenseCategory})</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Origin</label><input className="form-input" value={form.origin} onChange={e => setForm(p => ({...p, origin: e.target.value}))} required placeholder="e.g. Mumbai Warehouse" /></div>
            <div className="form-group"><label>Destination</label><input className="form-input" value={form.destination} onChange={e => setForm(p => ({...p, destination: e.target.value}))} required placeholder="e.g. Pune Hub" /></div>
          </div>
          <div className="form-group">
            <label>Cargo Weight (kg){selectedVehicle && <span style={{color:'var(--text-muted)'}}> — Max: {selectedVehicle.maxCapacity}kg</span>}</label>
            <input type="number" className="form-input" value={form.cargoWeight} onChange={e => setForm(p => ({...p, cargoWeight: e.target.value}))} required placeholder="Enter weight in kg" />
            {selectedVehicle && Number(form.cargoWeight) > selectedVehicle.maxCapacity && (
              <div className="alert alert-error" style={{marginTop:8,marginBottom:0}}>⚠ Cargo weight exceeds vehicle capacity of {selectedVehicle.maxCapacity}kg</div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Trip</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!completeModal} onClose={() => setCompleteModal(null)} title="Complete Trip">
        <p style={{marginBottom:16,color:'var(--text-secondary)'}}>Enter the final odometer reading for <strong>{completeModal?.vehicleName}</strong>.</p>
        <div className="form-group"><label>Odometer End (km)</label><input type="number" className="form-input" value={odometerEnd} onChange={e => setOdometerEnd(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setCompleteModal(null)}>Cancel</button>
          <button className="btn btn-success" onClick={complete}>Mark Complete</button>
        </div>
      </Modal>
    </div>
  );
}
