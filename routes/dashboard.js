const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Personal dashboard stats
router.get('/my-stats', authMiddleware, (req, res) => {
  const db = getDb();
  const uid = req.user.id;

  const coursesEnrolled = db.prepare('SELECT COUNT(*) as cnt FROM enrollments WHERE user_id = ?').get(uid).cnt;
  const coursesCompleted = db.prepare("SELECT COUNT(*) as cnt FROM enrollments WHERE user_id = ? AND status = 'completed'").get(uid).cnt;
  const avgProgress = db.prepare('SELECT ROUND(AVG(progress)) as avg FROM enrollments WHERE user_id = ?').get(uid).avg || 0;
  const mentorSessions = db.prepare("SELECT COUNT(*) as cnt FROM mentorship_sessions WHERE mentee_id = ? AND status IN ('accepted','completed')").get(uid).cnt;
  const unreadNotifs = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(uid).cnt;

  const recentCourses = db.prepare(`
    SELECT c.id, c.title, c.thumbnail_emoji, c.category, e.progress, e.status
    FROM enrollments e JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ? ORDER BY e.enrolled_at DESC LIMIT 3
  `).all(uid);

  const upcomingSession = db.prepare(`
    SELECT ms.*, u.name as mentor_name, mp.expertise
    FROM mentorship_sessions ms
    JOIN users u ON ms.mentor_id = u.id
    LEFT JOIN mentor_profiles mp ON mp.user_id = ms.mentor_id
    WHERE ms.mentee_id = ? AND ms.status = 'accepted' AND ms.scheduled_date >= date('now')
    ORDER BY ms.scheduled_date LIMIT 1
  `).get(uid);

  res.json({ coursesEnrolled, coursesCompleted, avgProgress, mentorSessions, unreadNotifs, recentCourses, upcomingSession });
});

// Admin M&E Dashboard
router.get('/admin', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();

  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'").get().cnt;
  const womenUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE gender = 'female' AND role = 'entrepreneur'").get().cnt;
  const youthUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE age BETWEEN 15 AND 35 AND role = 'entrepreneur'").get().cnt;
  const totalEnrollments = db.prepare('SELECT COUNT(*) as cnt FROM enrollments').get().cnt;
  const completions = db.prepare("SELECT COUNT(*) as cnt FROM enrollments WHERE status = 'completed'").get().cnt;
  const totalMentorSessions = db.prepare("SELECT COUNT(*) as cnt FROM mentorship_sessions WHERE status IN ('accepted','completed')").get().cnt;
  const completedSessions = db.prepare("SELECT COUNT(*) as cnt FROM mentorship_sessions WHERE status = 'completed'").get().cnt;
  const totalResources = db.prepare('SELECT COUNT(*) as cnt FROM resources').get().cnt;
  const totalDownloads = db.prepare('SELECT COALESCE(SUM(downloads), 0) as cnt FROM resources').get().cnt;

  const usersByLocation = db.prepare(`
    SELECT location, COUNT(*) as count FROM users
    WHERE role = 'entrepreneur' AND location IS NOT NULL
    GROUP BY location ORDER BY count DESC LIMIT 8
  `).all();

  const usersBySector = db.prepare(`
    SELECT sector, COUNT(*) as count FROM users
    WHERE role = 'entrepreneur' AND sector IS NOT NULL
    GROUP BY sector ORDER BY count DESC LIMIT 8
  `).all();

  const courseEnrollmentStats = db.prepare(`
    SELECT c.title, c.thumbnail_emoji,
      COUNT(e.id) as enrollments,
      SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as completions,
      ROUND(AVG(e.progress)) as avg_progress
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id
    GROUP BY c.id ORDER BY enrollments DESC
  `).all();

  const registrationsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM users WHERE role = 'entrepreneur'
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const businessStageBreakdown = db.prepare(`
    SELECT business_stage, COUNT(*) as count FROM users
    WHERE role = 'entrepreneur' AND business_stage IS NOT NULL
    GROUP BY business_stage
  `).all();

  const recentUsers = db.prepare(`
    SELECT id, name, email, gender, age, location, sector, business_stage, created_at
    FROM users WHERE role = 'entrepreneur'
    ORDER BY created_at DESC LIMIT 10
  `).all();

  res.json({
    summary: { totalUsers, womenUsers, youthUsers, totalEnrollments, completions, totalMentorSessions, completedSessions, totalResources, totalDownloads },
    usersByLocation,
    usersBySector,
    courseEnrollmentStats,
    registrationsByMonth,
    businessStageBreakdown,
    recentUsers
  });
});

module.exports = router;
