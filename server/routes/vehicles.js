import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all vehicles (with optional filters)
router.get('/', (req, res) => {
    const { type, status, region, availableOnly } = req.query;
    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (availableOnly === 'true') {
        sql += " AND status = 'Available'";
    }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (region) { sql += ' AND region = ?'; params.push(region); }

    sql += ' ORDER BY id DESC';
    res.json(db.prepare(sql).all(...params));
});

// GET single vehicle
router.get('/:id', (req, res) => {
    const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(v);
});

// POST create
router.post('/', (req, res) => {
    const { name, model, plate, type, maxCapacity, odometer, region, acquisitionCost } = req.body;
    if (!name || !model || !plate || !type || !maxCapacity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = db.prepare('SELECT id FROM vehicles WHERE plate = ?').get(plate);
    if (existing) return res.status(409).json({ error: 'License plate already exists' });

    const result = db.prepare(
        `INSERT INTO vehicles (name, model, plate, type, maxCapacity, odometer, region, acquisitionCost) VALUES (?,?,?,?,?,?,?,?)`
    ).run(name, model, plate, type, maxCapacity, odometer || 0, region || 'Central', acquisitionCost || 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Vehicle created' });
});

// PUT update
router.put('/:id', (req, res) => {
    const { name, model, plate, type, maxCapacity, odometer, status, region, acquisitionCost } = req.body;
    const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    if (plate && plate !== v.plate) {
        const dup = db.prepare('SELECT id FROM vehicles WHERE plate = ? AND id != ?').get(plate, req.params.id);
        if (dup) return res.status(409).json({ error: 'License plate already exists' });
    }

    db.prepare(`
    UPDATE vehicles SET name=?, model=?, plate=?, type=?, maxCapacity=?, odometer=?, status=?, region=?, acquisitionCost=?
    WHERE id=?
  `).run(
        name || v.name, model || v.model, plate || v.plate, type || v.type,
        maxCapacity ?? v.maxCapacity, odometer ?? v.odometer, status || v.status,
        region || v.region, acquisitionCost ?? v.acquisitionCost, req.params.id
    );

    res.json({ message: 'Vehicle updated' });
});

// PATCH toggle status
router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['Available', 'On Trip', 'In Shop', 'Retired'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Status updated' });
});

// DELETE
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    res.json({ message: 'Vehicle deleted' });
});

export default router;
