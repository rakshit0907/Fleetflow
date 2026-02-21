import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/validators';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import KPICard from '../components/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Download, FileSpreadsheet, TrendingUp, DollarSign, Fuel, PieChart as PieIcon } from 'lucide-react';
import './Analytics.css';

const COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [kpis, setKpis] = useState(null);
  const [fuelEff, setFuelEff] = useState([]);
  const [roi, setRoi] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [k, f, r, c, t] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/fuel-efficiency'),
        api.get('/analytics/vehicle-roi'),
        api.get('/analytics/cost-breakdown'),
        api.get('/analytics/monthly-trend'),
      ]);
      setKpis(k);
      setFuelEff(f);
      setRoi(r);
      setCostBreakdown(c);
      setTrend(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleExportCSV = (data, name) => exportToCSV(data, `fleetflow_${name}`);
  const handleExportPDF = (data, title, name) => exportToPDF(data, title, `fleetflow_${name}`);

  if (loading) return <div className="empty-state"><h3>Loading analytics...</h3></div>;

  const totalCost = costBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Operational Analytics</h1>
          <p className="subtitle">Data-driven fleet performance insights</p>
        </div>
        <div className="export-btns">
          <button className="btn btn-secondary" onClick={() => handleExportCSV(fuelEff, 'fuel_efficiency')} id="export-csv-btn">
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExportPDF(roi, 'Vehicle ROI Report', 'vehicle_roi')} id="export-pdf-btn">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid">
        <KPICard icon={<TrendingUp size={24} />} label="Total Vehicles" value={kpis?.totalVehicles || 0} color="accent" />
        <KPICard icon={<DollarSign size={24} />} label="Total Cost" value={formatCurrency(totalCost)} color="warning" />
        <KPICard icon={<Fuel size={24} />} label="Active Drivers" value={kpis?.activeDrivers || 0} subtitle={`of ${kpis?.totalDrivers || 0} total`} color="info" />
        <KPICard icon={<PieIcon size={24} />} label="Utilization" value={`${kpis?.utilizationRate || 0}%`} color="success" />
      </div>

      <div className="analytics-grid">
        {/* Fuel Efficiency */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3>Fuel Efficiency (km/L)</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => handleExportCSV(fuelEff, 'fuel_efficiency')}>
              <FileSpreadsheet size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fuelEff}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fuelEfficiency" name="km/L" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown Pie */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3>Cost Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={costBreakdown.filter(c => c.value > 0)}
                cx="50%" cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                labelLine={false}
              >
                {costBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle ROI */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3>Vehicle ROI (%)</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => handleExportPDF(roi, 'Vehicle ROI', 'roi')}>
              <Download size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roi}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roi" name="ROI" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <h3>Monthly Expense Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6366f1" fill="url(#gradientArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROI Table */}
      <div className="glass-panel chart-card" style={{ marginTop: 20 }}>
        <div className="chart-header">
          <h3>Vehicle ROI Detail</h3>
          <div className="export-btns">
            <button className="btn btn-sm btn-secondary" onClick={() => handleExportCSV(roi, 'roi_detail')}><FileSpreadsheet size={12} /> CSV</button>
            <button className="btn btn-sm btn-primary" onClick={() => handleExportPDF(roi, 'ROI Detail Report', 'roi_detail')}><Download size={12} /> PDF</button>
          </div>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Acquisition Cost</th>
                <th>Total Expenses</th>
                <th>Maintenance Cost</th>
                <th>Est. Revenue</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {roi.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{formatCurrency(r.acquisitionCost)}</td>
                  <td>{formatCurrency(r.totalExpenses)}</td>
                  <td>{formatCurrency(r.totalMaintenance)}</td>
                  <td>{formatCurrency(r.estimatedRevenue)}</td>
                  <td style={{ fontWeight: 700, color: r.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>{r.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
