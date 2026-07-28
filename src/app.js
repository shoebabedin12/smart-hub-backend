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
const routineRoutes = require('./routes/routine.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const userRoutes = require('./routes/user.routes');
const batchesRoutes = require('./routes/batches.routes');

const app = express();


// ===============================
// CORS CONFIG
// ===============================

const corsOptions = {
  origin: function (origin, callback) {

    const allowedOrigins = [
      '*',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    // Allow Postman, mobile apps, server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
};


app.use(cors(corsOptions));


// ===============================
// BODY PARSER
// ===============================

app.use(express.json());


// ===============================
// STATIC FILES
// ===============================

app.use('/uploads', express.static('uploads'));


// ===============================
// API ROUTES
// ===============================

app.use('/api/auth', authRoutes);

app.use('/api/notices', noticeRoutes);

app.use('/api/resources', resourceRoutes);

app.use('/api/chat', chatRoutes);

app.use('/api/results', resultRoutes);

app.use('/api/departments', deptRoutes);

app.use('/api/profile', profileRoutes);

app.use('/api/routine', routineRoutes);

app.use('/api/assignments', assignmentRoutes);

app.use('/api/users', userRoutes);

app.use('/api/batches', batchesRoutes);


// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {

  console.error("GLOBAL ERROR:", err.message);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS Error: Origin not allowed'
    });
  }

  res.status(500).json({
    message: err.message,
    error: err
  });

});


// ===============================
// TEST ROUTE
// ===============================

app.get('/', (req, res) => {

  res.json({
    message: 'Smart Hub API running'
  });

});


module.exports = app;