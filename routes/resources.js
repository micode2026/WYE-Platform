const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { type, category } = req.query;
  const db = getDb();
  let query = 'SELECT r.*, u.name as creator_name FROM resources r LEFT JOIN users u ON r.created_by = u.id WHERE 1=1';
  const params = [];
  if (type) { query += ' AND r.type = ?'; params.push(type); }
  if (category) { query += ' AND r.category = ?'; params.push(category); }
  query += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/:id/download', authMiddleware, (req, res) => {
  const db = getDb();
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  db.prepare('UPDATE resources SET downloads = downloads + 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Download recorded', file_url: resource.file_url, external_url: resource.external_url });
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { title, description, type, category, file_url, external_url, emoji } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO resources (title, description, type, category, file_url, external_url, emoji, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, type || null, category || null, file_url || null, external_url || null, emoji || '📄', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
