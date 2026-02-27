const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all available mentors
router.get('/mentors', authMiddleware, (req, res) => {
  const db = getDb();
  const mentors = db.prepare(`
    SELECT u.id, u.name, u.location, u.bio, u.sector, u.avatar_url,
      mp.expertise, mp.industries, mp.languages, mp.years_experience, mp.available,
      (SELECT COUNT(*) FROM mentorship_sessions WHERE mentor_id = u.id AND status = 'completed') as sessions_completed
    FROM users u
    JOIN mentor_profiles mp ON mp.user_id = u.id
    WHERE u.role = 'mentor'
    ORDER BY mp.years_experience DESC
  `).all();
  res.json(mentors);
});

// Get my mentorship sessions (as mentee or mentor)
router.get('/sessions', authMiddleware, (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT ms.*,
      mentee.name as mentee_name, mentee.sector as mentee_sector,
      mentor.name as mentor_name, mp.expertise as mentor_expertise
    FROM mentorship_sessions ms
    JOIN users mentee ON ms.mentee_id = mentee.id
    JOIN users mentor ON ms.mentor_id = mentor.id
    LEFT JOIN mentor_profiles mp ON mp.user_id = ms.mentor_id
    WHERE ms.mentee_id = ? OR ms.mentor_id = ?
    ORDER BY ms.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(sessions);
});

// Request a mentorship session
router.post('/request', authMiddleware, (req, res) => {
  const { mentor_id, message, topic, scheduled_date } = req.body;
  if (!mentor_id || !message) return res.status(400).json({ error: 'Mentor ID and message required' });

  const db = getDb();
  const mentor = db.prepare('SELECT u.id, u.name FROM users u JOIN mentor_profiles mp ON mp.user_id = u.id WHERE u.id = ? AND mp.available = 1').get(mentor_id);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found or unavailable' });

  const result = db.prepare(`
    INSERT INTO mentorship_sessions (mentee_id, mentor_id, message, topic, scheduled_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, mentor_id, message, topic || null, scheduled_date || null);

  const mentee = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  // Notify mentor
  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'info')`)
    .run(mentor_id, 'New Mentorship Request', `${mentee.name} has requested a mentorship session with you.`);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Request sent successfully' });
});

// Update session status (mentor can accept/reject/complete)
router.put('/sessions/:id', authMiddleware, (req, res) => {
  const { status, notes, scheduled_date } = req.body;
  const db = getDb();
  const session = db.prepare('SELECT * FROM mentorship_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.mentor_id !== req.user.id && session.mentee_id !== req.user.id)
    return res.status(403).json({ error: 'Not authorised' });

  db.prepare(`
    UPDATE mentorship_sessions SET status = ?, notes = ?, scheduled_date = ? WHERE id = ?
  `).run(status, notes || session.notes, scheduled_date || session.scheduled_date, req.params.id);

  // Notify the other party
  const notifyUserId = req.user.id === session.mentor_id ? session.mentee_id : session.mentor_id;
  const actor = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const msgMap = {
    accepted: `${actor.name} accepted your mentorship request!`,
    rejected: `${actor.name} was unable to accept your mentorship request.`,
    completed: `Your mentorship session with ${actor.name} has been marked as completed.`
  };
  if (msgMap[status]) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`)
      .run(notifyUserId, 'Mentorship Update', msgMap[status], status === 'accepted' ? 'success' : 'info');
  }

  res.json({ message: 'Updated' });
});

// Mentor: update own availability
router.put('/availability', authMiddleware, (req, res) => {
  const { available, expertise, industries, years_experience } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM mentor_profiles WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare('UPDATE mentor_profiles SET available=?, expertise=?, industries=?, years_experience=? WHERE user_id=?')
      .run(available ? 1 : 0, expertise, industries, years_experience, req.user.id);
  } else {
    db.prepare('INSERT INTO mentor_profiles (user_id, available, expertise, industries, years_experience) VALUES (?,?,?,?,?)')
      .run(req.user.id, available ? 1 : 0, expertise, industries, years_experience || 0);
  }
  res.json({ message: 'Profile updated' });
});

module.exports = router;
