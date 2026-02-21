import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import KPICard from '../components/KPICard';
import StatusPill from '../components/StatusPill';
import SearchBar from '../components/SearchBar';
import { formatDateTime } from '../utils/validators';
import { Truck, AlertTriangle, Gauge, Package, Plus, Route as RouteIcon, ArrowRight } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [activity, setActivity] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [groups, setGroups] = useState(null);
  const [groupKey, setGroupKey] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [kpiData, actData, vData] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/recent-activity'),
        api.get('/vehicles')
      ]);
      setKpis(kpiData);
      setActivity(actData);
      setAllVehicles(vData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  const renderTable = (list) => (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Plate</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map(v => (
            <tr key={v.id}>
              <td style={{ fontWeight: 600 }}>{v.name}</td>
              <td><code className="plate-code">{v.plate}</code></td>
              <td>{v.type}</td>
              <td><StatusPill status={v.status} /></td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={4}><div className="empty-state"><h3>No vehicles</h3></div></td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Command Center</h1>
          <p className="subtitle">Real-time fleet overview and operations</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/vehicles')} id="quick-add-vehicle">
            <Plus size={16} /> Add Vehicle
          </button>
          <button className="btn btn-accent" onClick={() => navigate('/trips')} id="quick-new-trip">
            <RouteIcon size={16} /> New Trip
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard icon={<Truck size={24} />} label="Active Fleet" value={kpis?.activeFleet || 0} subtitle={`${kpis?.totalVehicles || 0} total vehicles`} color="info" />
        <KPICard icon={<AlertTriangle size={24} />} label="Maintenance Alerts" value={kpis?.maintenanceAlerts || 0} subtitle="Vehicles in shop" color="warning" />
        <KPICard icon={<Gauge size={24} />} label="Utilization Rate" value={`${kpis?.utilizationRate || 0}%`} subtitle="Fleet assigned vs idle" color="accent" />
        <KPICard icon={<Package size={24} />} label="Pending Cargo" value={kpis?.pendingCargo || 0} subtitle="Awaiting dispatch" color="danger" />
      </div>

      <SearchBar
        data={allVehicles}
        onResult={(filtered, grps, gk) => { setVehicles(filtered); setGroups(grps); setGroupKey(gk); }}
        searchKeys={['name', 'plate', 'model', 'type']}
        sortOptions={[
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'maxCapacity', label: 'Capacity' },
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

      <div className="dashboard-grid">
        {/* Fleet Summary */}
        <div className="glass-panel dashboard-card">
          <h3 className="card-title">Fleet Overview</h3>
          {groups ? (
            Object.entries(groups).map(([key, items]) => (
              <div key={key}>
                <div className="group-header"><h3>{key}</h3><span className="group-count">{items.length}</span></div>
                {renderTable(items)}
              </div>
            ))
          ) : renderTable(vehicles.slice(0, 8))}
        </div>

        {/* Recent Activity */}
        <div className="glass-panel dashboard-card">
          <h3 className="card-title">Recent Activity</h3>
          <div className="activity-list">
            {activity.map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-icon"><ArrowRight size={14} /></div>
                <div className="activity-body">
                  <div className="activity-desc"><strong>{a.vehicleName}</strong> — {a.description}</div>
                  <div className="activity-meta">
                    <StatusPill status={a.status} />
                    <span className="activity-driver">{a.driverName}</span>
                    <span className="activity-time">{formatDateTime(a.date)}</span>
                  </div>
                </div>
              </div>
            ))}
            {!activity.length && <div className="empty-state"><h3>No recent activity</h3></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
