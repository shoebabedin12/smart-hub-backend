const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const noticeRoutes = require('./routes/notice.routes');
const resourceRoutes = require('./routes/resource.routes');
const chatRoutes = require('./routes/chat.routes');
const resultRoutes = require('./routes/result.routes');
const deptRoutes = require('./routes/department.routes');
const profileRoutes = require('./routes/profile.routes');
const routineRoutes    = require('./routes/routine.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));


// routes
app.use('/api/auth', authRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/departments', deptRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/routine',     routineRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);

// test route
app.get('/', (req, res) => {
  res.json({ message: 'Smart Hub API running' });
});

module.exports = app;