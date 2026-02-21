import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET dashboard KPIs
router.get('/dashboard', (req, res) => {
    const activeFleet = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'On Trip'").get().c;
    const maintenanceAlerts = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'In Shop'").get().c;
    const totalVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status != 'Retired'").get().c;
    const assignedVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'On Trip'").get().c;
    const pendingCargo = db.prepare("SELECT COUNT(*) as c FROM trips WHERE status IN ('Draft')").get().c;
    const totalDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers").get().c;
    const activeDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'On Duty'").get().c;

    const utilizationRate = totalVehicles > 0 ? Math.round((assignedVehicles / totalVehicles) * 100) : 0;

    res.json({
        activeFleet,
        maintenanceAlerts,
        utilizationRate,
        pendingCargo,
        totalVehicles,
        totalDrivers,
        activeDrivers
    });
});

// GET fuel efficiency per vehicle (km / L)
router.get('/fuel-efficiency', (req, res) => {
    const data = db.prepare(`
    SELECT
      v.id, v.name, v.plate,
      COALESCE(SUM(e.liters), 0) as totalLiters,
      COALESCE(
        (SELECT SUM(t.odometerEnd - t.odometerStart)
         FROM trips t WHERE t.vehicleId = v.id AND t.status = 'Completed' AND t.odometerEnd IS NOT NULL),
        0
      ) as totalKm
    FROM vehicles v
    LEFT JOIN expenses e ON e.vehicleId = v.id AND e.type = 'Fuel' AND e.liters > 0
    GROUP BY v.id
    HAVING totalLiters > 0
  `).all();

    res.json(data.map(d => ({
        ...d,
        fuelEfficiency: d.totalLiters > 0 ? Math.round((d.totalKm / d.totalLiters) * 100) / 100 : 0
    })));
});

// GET vehicle ROI
router.get('/vehicle-roi', (req, res) => {
    const data = db.prepare(`
    SELECT
      v.id, v.name, v.plate, v.acquisitionCost,
      COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicleId = v.id), 0) as totalExpenses,
      COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicleId = v.id), 0) as totalMaintenance,
      (SELECT COUNT(*) FROM trips WHERE vehicleId = v.id AND status = 'Completed') as completedTrips
    FROM vehicles v
    WHERE v.acquisitionCost > 0
    ORDER BY v.id
  `).all();

    res.json(data.map(d => {
        const estimatedRevenue = d.completedTrips * 15000; // estimated revenue per trip
        const roi = d.acquisitionCost > 0
            ? Math.round(((estimatedRevenue - (d.totalMaintenance + d.totalExpenses)) / d.acquisitionCost) * 10000) / 100
            : 0;
        return { ...d, estimatedRevenue, roi };
    }));
});

// GET cost breakdown
router.get('/cost-breakdown', (req, res) => {
    const fuel = db.prepare("SELECT COALESCE(SUM(cost),0) as total FROM expenses WHERE type='Fuel'").get().total;
    const tolls = db.prepare("SELECT COALESCE(SUM(cost),0) as total FROM expenses WHERE type='Toll'").get().total;
    const other = db.prepare("SELECT COALESCE(SUM(cost),0) as total FROM expenses WHERE type='Other'").get().total;
    const maintenance = db.prepare("SELECT COALESCE(SUM(cost),0) as total FROM maintenance").get().total;

    res.json([
        { name: 'Fuel', value: fuel },
        { name: 'Tolls', value: tolls },
        { name: 'Maintenance', value: maintenance },
        { name: 'Other', value: other }
    ]);
});

// GET monthly trend
router.get('/monthly-trend', (req, res) => {
    const data = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(cost) as total
    FROM expenses
    GROUP BY month
    ORDER BY month
  `).all();
    res.json(data);
});

// GET recent activity
router.get('/recent-activity', (req, res) => {
    const trips = db.prepare(`
    SELECT 'trip' as activityType, t.id, t.status, t.createdAt as date,
      v.name as vehicleName, d.name as driverName,
      t.origin || ' → ' || t.destination as description
    FROM trips t
    JOIN vehicles v ON t.vehicleId = v.id
    JOIN drivers d ON t.driverId = d.id
    ORDER BY t.id DESC LIMIT 10
  `).all();

    res.json(trips);
});

export default router;
