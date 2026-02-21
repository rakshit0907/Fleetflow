import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.prepare('SELECT id, email, name, role FROM users WHERE email = ? AND password = ?').get(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ user });
});

router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const validRoles = ['manager', 'dispatcher', 'safety_officer', 'analyst'];
    const userRole = validRoles.includes(role) ? role : 'dispatcher';

    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, password, userRole);
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ user });
});

router.get('/users', (req, res) => {
    const users = db.prepare('SELECT id, email, name, role FROM users').all();
    res.json(users);
});

export default router;
