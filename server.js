const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const mentorshipRoutes = require('./routes/mentorship');
const resourceRoutes = require('./routes/resources');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Women & Youth Entrepreneurship Platform`);
  console.log(`  Digital Tigray Agency`);
  console.log(`  Running on http://localhost:${PORT}\n`);
  console.log(`  Default admin login:`);
  console.log(`    Email:    admin@tigdigital.gov.et`);
  console.log(`    Password: Admin@1234\n`);
});
