const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, gender, age, location, sector, business_stage } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, gender, age, location, sector, business_stage)
    VALUES (?, ?, ?, 'entrepreneur', ?, ?, ?, ?, ?)
  `).run(name, email, password_hash, gender || null, age || null, location || null, sector || null, business_stage || null);

  // Welcome notification
  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'info')`)
    .run(result.lastInsertRowid, 'Welcome to the Platform!', 'Start your journey by enrolling in a course or connecting with a mentor.');

  const user = db.prepare('SELECT id, name, email, role, gender, age, location, sector, business_stage, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const { password_hash, ...safe } = user;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safe });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, role, gender, age, location, phone, bio, sector, business_stage, avatar_url, created_at, last_login
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/me', authMiddleware, (req, res) => {
  const { name, gender, age, location, phone, bio, sector, business_stage } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE users SET name=?, gender=?, age=?, location=?, phone=?, bio=?, sector=?, business_stage=?
    WHERE id=?
  `).run(name, gender, age, location, phone, bio, sector, business_stage, req.user.id);
  const user = db.prepare(`
    SELECT id, name, email, role, gender, age, location, phone, bio, sector, business_stage, avatar_url, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json(user);
});

module.exports = router;
