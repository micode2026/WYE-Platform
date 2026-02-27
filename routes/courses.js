const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// List all published courses (with enrollment status if logged in)
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const courses = db.prepare(`
    SELECT c.*,
      u.name as creator_name,
      (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
      e.progress, e.status as enrollment_status
    FROM courses c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
    WHERE c.is_published = 1
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(courses);
});

// Get single course with modules
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const course = db.prepare(`
    SELECT c.*, u.name as creator_name,
      e.progress, e.status as enrollment_status, e.enrolled_at
    FROM courses c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
    WHERE c.id = ?
  `).get(req.user.id, req.params.id);

  if (!course) return res.status(404).json({ error: 'Course not found' });

  const modules = db.prepare(`
    SELECT m.*,
      CASE WHEN mc.id IS NOT NULL THEN 1 ELSE 0 END as completed
    FROM modules m
    LEFT JOIN module_completions mc ON mc.module_id = m.id AND mc.user_id = ?
    WHERE m.course_id = ?
    ORDER BY m.order_index
  `).all(req.user.id, req.params.id);

  res.json({ ...course, modules });
});

// Enroll in a course
router.post('/:id/enroll', authMiddleware, (req, res) => {
  const db = getDb();
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND is_published = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  try {
    db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ message: 'Enrolled successfully' });
  } catch {
    res.status(409).json({ error: 'Already enrolled' });
  }
});

// Mark a module complete and update course progress
router.post('/:courseId/modules/:moduleId/complete', authMiddleware, (req, res) => {
  const db = getDb();

  try {
    db.prepare('INSERT OR IGNORE INTO module_completions (user_id, module_id) VALUES (?, ?)')
      .run(req.user.id, req.params.moduleId);
  } catch { /* ignore */ }

  // Recalculate progress
  const totalModules = db.prepare('SELECT COUNT(*) as cnt FROM modules WHERE course_id = ?').get(req.params.courseId).cnt;
  const completedModules = db.prepare(`
    SELECT COUNT(*) as cnt FROM module_completions mc
    JOIN modules m ON mc.module_id = m.id
    WHERE mc.user_id = ? AND m.course_id = ?
  `).get(req.user.id, req.params.courseId).cnt;

  const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const status = progress === 100 ? 'completed' : 'in_progress';
  const completedAt = progress === 100 ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE enrollments SET progress = ?, status = ?, completed_at = ?
    WHERE user_id = ? AND course_id = ?
  `).run(progress, status, completedAt, req.user.id, req.params.courseId);

  if (progress === 100) {
    const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(req.params.courseId);
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'success')`)
      .run(req.user.id, 'Course Completed! 🎉', `Congratulations! You completed "${course.title}".`);
  }

  res.json({ progress, status });
});

// Admin: create course
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { title, description, category, level, duration_hours, thumbnail_emoji } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO courses (title, description, category, level, duration_hours, thumbnail_emoji, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, category || null, level || 'beginner', duration_hours || 1, thumbnail_emoji || '📚', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Admin: add module to course
router.post('/:id/modules', authMiddleware, adminOnly, (req, res) => {
  const { title, content, type, order_index, duration_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO modules (course_id, title, content, type, order_index, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, title, content, type || 'text', order_index || 0, duration_minutes || 15);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
