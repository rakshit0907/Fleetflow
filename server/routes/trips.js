import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all trips
router.get('/', (req, res) => {
    const { status, vehicleId } = req.query;
    let sql = `
    SELECT t.*, v.name as vehicleName, v.plate as vehiclePlate, d.name as driverName
    FROM trips t
    JOIN vehicles v ON t.vehicleId = v.id
    JOIN drivers d ON t.driverId = d.id
    WHERE 1=1
  `;
    const params = [];
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (vehicleId) { sql += ' AND t.vehicleId = ?'; params.push(vehicleId); }
    sql += ' ORDER BY t.id DESC';

    res.json(db.prepare(sql).all(...params));
});

// GET single trip
router.get('/:id', (req, res) => {
    const t = db.prepare(`
    SELECT t.*, v.name as vehicleName, v.plate as vehiclePlate, d.name as driverName
    FROM trips t JOIN vehicles v ON t.vehicleId = v.id JOIN drivers d ON t.driverId = d.id
    WHERE t.id = ?
  `).get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Trip not found' });
    res.json(t);
});

// POST create trip (with validation)
router.post('/', (req, res) => {
    const { vehicleId, driverId, origin, destination, cargoWeight } = req.body;
    if (!vehicleId || !driverId || !origin || !destination || cargoWeight == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status !== 'Available') return res.status(400).json({ error: `Vehicle is currently "${vehicle.status}"` });

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    if (driver.status !== 'Off Duty') return res.status(400).json({ error: `Driver is currently "${driver.status}"` });

    // License expiry check
    if (new Date(driver.licenseExpiry) < new Date()) {
        return res.status(400).json({ error: 'Driver license has expired' });
    }

    // License category check
    const categories = driver.licenseCategory.split(',').map(c => c.trim());
    if (!categories.includes(vehicle.type)) {
        return res.status(400).json({ error: `Driver not licensed for ${vehicle.type} (has: ${driver.licenseCategory})` });
    }

    // Cargo weight validation
    if (cargoWeight > vehicle.maxCapacity) {
        return res.status(400).json({ error: `Cargo ${cargoWeight}kg exceeds vehicle max capacity ${vehicle.maxCapacity}kg` });
    }

    const result = db.prepare(
        `INSERT INTO trips (vehicleId, driverId, origin, destination, cargoWeight, odometerStart) VALUES (?,?,?,?,?,?)`
    ).run(vehicleId, driverId, origin, destination, cargoWeight, vehicle.odometer);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Trip created as Draft' });
});

// PATCH dispatch trip (Draft -> Dispatched)
router.patch('/:id/dispatch', (req, res) => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'Draft') return res.status(400).json({ error: 'Only Draft trips can be dispatched' });

    const txn = db.transaction(() => {
        db.prepare("UPDATE trips SET status = 'Dispatched', dispatchedAt = datetime('now') WHERE id = ?").run(req.params.id);
        db.prepare("UPDATE vehicles SET status = 'On Trip' WHERE id = ?").run(trip.vehicleId);
        db.prepare("UPDATE drivers SET status = 'On Duty' WHERE id = ?").run(trip.driverId);
    });
    txn();

    res.json({ message: 'Trip dispatched' });
});

// PATCH complete trip (Dispatched -> Completed)
router.patch('/:id/complete', (req, res) => {
    const { odometerEnd } = req.body;
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'Dispatched') return res.status(400).json({ error: 'Only Dispatched trips can be completed' });

    const txn = db.transaction(() => {
        db.prepare("UPDATE trips SET status = 'Completed', completedAt = datetime('now'), odometerEnd = ? WHERE id = ?")
            .run(odometerEnd || trip.odometerStart, req.params.id);
        db.prepare("UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?")
            .run(odometerEnd || trip.odometerStart, trip.vehicleId);
        db.prepare("UPDATE drivers SET status = 'Off Duty', tripsCompleted = tripsCompleted + 1 WHERE id = ?")
            .run(trip.driverId);
    });
    txn();

    res.json({ message: 'Trip completed' });
});

// PATCH cancel trip
router.patch('/:id/cancel', (req, res) => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
        return res.status(400).json({ error: 'Trip already finalized' });
    }

    const txn = db.transaction(() => {
        db.prepare("UPDATE trips SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
        if (trip.status === 'Dispatched') {
            db.prepare("UPDATE vehicles SET status = 'Available' WHERE id = ?").run(trip.vehicleId);
            db.prepare("UPDATE drivers SET status = 'Off Duty', tripsCancelled = tripsCancelled + 1 WHERE id = ?").run(trip.driverId);
        }
    });
    txn();

    res.json({ message: 'Trip cancelled' });
});

export default router;
