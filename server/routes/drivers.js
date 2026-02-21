import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all drivers
router.get('/', (req, res) => {
    const { status, availableOnly } = req.query;
    let sql = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];

    if (availableOnly === 'true') {
        sql += " AND status = 'Off Duty' AND licenseExpiry > date('now')";
    }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY id DESC';
    res.json(db.prepare(sql).all(...params));
});

// GET single driver
router.get('/:id', (req, res) => {
    const d = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    if (!d) return res.status(404).json({ error: 'Driver not found' });
    res.json(d);
});

// POST create
router.post('/', (req, res) => {
    const { name, licenseNumber, licenseCategory, licenseExpiry, safetyScore } = req.body;
    if (!name || !licenseNumber || !licenseCategory || !licenseExpiry) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = db.prepare('SELECT id FROM drivers WHERE licenseNumber = ?').get(licenseNumber);
    if (existing) return res.status(409).json({ error: 'License number already exists' });

    const result = db.prepare(
        `INSERT INTO drivers (name, licenseNumber, licenseCategory, licenseExpiry, safetyScore) VALUES (?,?,?,?,?)`
    ).run(name, licenseNumber, licenseCategory, licenseExpiry, safetyScore || 100);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Driver created' });
});

// PUT update
router.put('/:id', (req, res) => {
    const d = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    if (!d) return res.status(404).json({ error: 'Driver not found' });

    const { name, licenseNumber, licenseCategory, licenseExpiry, safetyScore, status, tripsCompleted, tripsCancelled } = req.body;

    if (licenseNumber && licenseNumber !== d.licenseNumber) {
        const dup = db.prepare('SELECT id FROM drivers WHERE licenseNumber = ? AND id != ?').get(licenseNumber, req.params.id);
        if (dup) return res.status(409).json({ error: 'License number already exists' });
    }

    db.prepare(`
    UPDATE drivers SET name=?, licenseNumber=?, licenseCategory=?, licenseExpiry=?, safetyScore=?, status=?, tripsCompleted=?, tripsCancelled=?
    WHERE id=?
  `).run(
        name || d.name, licenseNumber || d.licenseNumber, licenseCategory || d.licenseCategory,
        licenseExpiry || d.licenseExpiry, safetyScore ?? d.safetyScore, status || d.status,
        tripsCompleted ?? d.tripsCompleted, tripsCancelled ?? d.tripsCancelled, req.params.id
    );

    res.json({ message: 'Driver updated' });
});

// PATCH toggle status
router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const valid = ['On Duty', 'Off Duty', 'Suspended'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Status updated' });
});

// DELETE
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Driver deleted' });
});

export default router;
