import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all maintenance logs
router.get('/', (req, res) => {
    const { vehicleId, status } = req.query;
    let sql = `
    SELECT m.*, v.name as vehicleName, v.plate as vehiclePlate
    FROM maintenance m
    JOIN vehicles v ON m.vehicleId = v.id
    WHERE 1=1
  `;
    const params = [];
    if (vehicleId) { sql += ' AND m.vehicleId = ?'; params.push(vehicleId); }
    if (status) { sql += ' AND m.status = ?'; params.push(status); }
    sql += ' ORDER BY m.id DESC';

    res.json(db.prepare(sql).all(...params));
});

// POST create maintenance log (auto sets vehicle to "In Shop")
router.post('/', (req, res) => {
    const { vehicleId, serviceType, cost, notes } = req.body;
    if (!vehicleId || !serviceType) {
        return res.status(400).json({ error: 'Vehicle and service type required' });
    }

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status === 'On Trip') {
        return res.status(400).json({ error: 'Cannot service a vehicle that is On Trip' });
    }

    const txn = db.transaction(() => {
        const result = db.prepare(
            `INSERT INTO maintenance (vehicleId, serviceType, cost, notes) VALUES (?,?,?,?)`
        ).run(vehicleId, serviceType, cost || 0, notes || '');
        db.prepare("UPDATE vehicles SET status = 'In Shop' WHERE id = ?").run(vehicleId);
        return result;
    });
    const result = txn();

    res.status(201).json({ id: result.lastInsertRowid, message: 'Maintenance log created, vehicle is now In Shop' });
});

// PATCH complete maintenance
router.patch('/:id/complete', (req, res) => {
    const m = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Maintenance log not found' });
    if (m.status === 'Completed') return res.status(400).json({ error: 'Already completed' });

    const txn = db.transaction(() => {
        db.prepare("UPDATE maintenance SET status = 'Completed', completedAt = datetime('now') WHERE id = ?").run(req.params.id);
        // Only set to Available if no other active maintenance exists for this vehicle
        const activeCount = db.prepare("SELECT COUNT(*) as c FROM maintenance WHERE vehicleId = ? AND status = 'In Progress' AND id != ?")
            .get(m.vehicleId, req.params.id).c;
        if (activeCount === 0) {
            db.prepare("UPDATE vehicles SET status = 'Available' WHERE id = ?").run(m.vehicleId);
        }
    });
    txn();

    res.json({ message: 'Maintenance completed' });
});

// PUT update
router.put('/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Maintenance log not found' });

    const { serviceType, cost, notes } = req.body;
    db.prepare('UPDATE maintenance SET serviceType=?, cost=?, notes=? WHERE id=?')
        .run(serviceType || m.serviceType, cost ?? m.cost, notes ?? m.notes, req.params.id);

    res.json({ message: 'Maintenance updated' });
});

// DELETE
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM maintenance WHERE id = ?').run(req.params.id);
    res.json({ message: 'Maintenance log deleted' });
});

export default router;
