import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all expenses
router.get('/', (req, res) => {
    const { vehicleId, type, dateFrom, dateTo } = req.query;
    let sql = `
    SELECT e.*, v.name as vehicleName, v.plate as vehiclePlate
    FROM expenses e
    JOIN vehicles v ON e.vehicleId = v.id
    WHERE 1=1
  `;
    const params = [];
    if (vehicleId) { sql += ' AND e.vehicleId = ?'; params.push(vehicleId); }
    if (type) { sql += ' AND e.type = ?'; params.push(type); }
    if (dateFrom) { sql += ' AND e.date >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND e.date <= ?'; params.push(dateTo); }
    sql += ' ORDER BY e.date DESC, e.id DESC';

    res.json(db.prepare(sql).all(...params));
});

// GET per-vehicle cost summary
router.get('/summary', (req, res) => {
    const summary = db.prepare(`
    SELECT
      v.id, v.name, v.plate,
      COALESCE(SUM(CASE WHEN e.type = 'Fuel' THEN e.cost ELSE 0 END), 0) as fuelCost,
      COALESCE(SUM(CASE WHEN e.type != 'Fuel' THEN e.cost ELSE 0 END), 0) as otherCost,
      COALESCE(SUM(e.cost), 0) as totalExpenses,
      COALESCE((SELECT SUM(m.cost) FROM maintenance m WHERE m.vehicleId = v.id), 0) as maintenanceCost
    FROM vehicles v
    LEFT JOIN expenses e ON e.vehicleId = v.id
    GROUP BY v.id
    ORDER BY totalExpenses DESC
  `).all();

    res.json(summary.map(s => ({
        ...s,
        totalOperationalCost: s.totalExpenses + s.maintenanceCost
    })));
});

// POST create expense
router.post('/', (req, res) => {
    const { vehicleId, tripId, type, liters, cost, date } = req.body;
    if (!vehicleId || !cost) {
        return res.status(400).json({ error: 'Vehicle and cost are required' });
    }

    const result = db.prepare(
        `INSERT INTO expenses (vehicleId, tripId, type, liters, cost, date) VALUES (?,?,?,?,?,?)`
    ).run(vehicleId, tripId || null, type || 'Fuel', liters || null, cost, date || new Date().toISOString().split('T')[0]);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Expense recorded' });
});

// PUT update
router.put('/:id', (req, res) => {
    const e = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Expense not found' });

    const { vehicleId, tripId, type, liters, cost, date } = req.body;
    db.prepare('UPDATE expenses SET vehicleId=?, tripId=?, type=?, liters=?, cost=?, date=? WHERE id=?')
        .run(vehicleId || e.vehicleId, tripId ?? e.tripId, type || e.type, liters ?? e.liters, cost ?? e.cost, date || e.date, req.params.id);

    res.json({ message: 'Expense updated' });
});

// DELETE
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Expense deleted' });
});

export default router;
