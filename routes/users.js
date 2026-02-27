const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user
router.get('/notifications', authMiddleware, (req, res) => {
  const db = getDb();
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json(notifications);
});

// Mark notification as read
router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

// Mark all notifications as read
router.put('/notifications/read-all', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

// Get current user's enrolled courses summary
router.get('/my-courses', authMiddleware, (req, res) => {
  const db = getDb();
  const courses = db.prepare(`
    SELECT c.id, c.title, c.category, c.thumbnail_emoji, c.duration_hours,
      e.progress, e.status, e.enrolled_at, e.completed_at,
      (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as total_modules
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(req.user.id);
  res.json(courses);
});

// Admin: list all users
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, name, email, role, gender, age, location, sector, business_stage, created_at, last_login
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// Admin: delete user
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// Admin: update user role
router.put('/:id/role', authMiddleware, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!['entrepreneur', 'mentor', 'admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  const db = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  // If promoting to mentor, ensure mentor_profile exists
  if (role === 'mentor') {
    const existing = db.prepare('SELECT id FROM mentor_profiles WHERE user_id = ?').get(req.params.id);
    if (!existing) {
      db.prepare('INSERT INTO mentor_profiles (user_id, expertise, years_experience, available) VALUES (?,?,?,1)')
        .run(req.params.id, 'General Business', 0);
    }
  }
  res.json({ message: 'Role updated' });
});

module.exports = router;
