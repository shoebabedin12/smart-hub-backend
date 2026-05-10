const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const noticeRoutes = require('./routes/notice.routes');
const resourceRoutes = require('./routes/resource.routes');
const chatRoutes = require('./routes/chat.routes');
const resultRoutes = require('./routes/result.routes');
const deptRoutes = require('./routes/department.routes');

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

// test route
app.get('/', (req, res) => {
  res.json({ message: 'Smart Hub API running' });
});

module.exports = app;