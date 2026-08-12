const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// REGISTER
// 🔒 Public self-registration can ONLY ever create a 'student' account.
// Any `role` field sent by the client is ignored — faculty accounts are
// created exclusively by an admin via createFaculty below, and admin
// accounts are never created through any API endpoint.
exports.register = async (req, res) => {
  const { full_name, email, password_hash, department_id, batch, semester } = req.body;

  if (!full_name || !email || !password_hash || !department_id || !batch) {
    return res.status(400).json({
      message: 'All fields required'
    });
  }

  try {
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (exists.length > 0) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const hash = await bcrypt.hash(password_hash, 10);

    await pool.query(
      `INSERT INTO users
      (full_name, email, password_hash, role, department_id, batch, semester)
      VALUES (?, ?, ?, 'student', ?, ?, ?)`,
      [
        full_name,
        email,
        hash,
        department_id,
        batch,
        semester || '7th'
      ]
    );

    const [rows] = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.department_id,
        d.name AS department_name,
        u.batch,
        u.semester
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );

    res.status(201).json({
      message: 'Registered successfully',
      user: rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password_hash } = req.body;

  if (!email || !password_hash) {
    return res.status(400).json({
      message: 'Email and password required'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
        u.*,
        d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const user = rows[0];

    const match = await bcrypt.compare(
      password_hash,
      user.password_hash
    );

    if (!match) {
      return res.status(401).json({
        message: 'Wrong password'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        full_name: user.full_name,
        batch: user.batch,
        semester: user.semester || '7th'
      },
      process.env.JWT_SECRET || 'your_fallback_secret',
      {
        expiresIn: '7d'
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        batch: user.batch,
        semester: user.semester || '7th'
      }
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// ME / PROFILE
exports.me = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.batch,
      u.semester,
      u.department_id,
      d.name AS department_name,
      u.profile_photo,
      u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// CREATE FACULTY (admin-only)
// The only way a faculty account can be created — admin sets the initial
// password and the account is immediately usable with role 'faculty'.
exports.createFaculty = async (req, res) => {
  const { full_name, email, password, department_id } = req.body;

  if (!full_name || !email || !password || !department_id) {
    return res.status(400).json({
      message: 'Full name, email, password and department are required'
    });
  }

  try {
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (exists.length > 0) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users
      (full_name, email, password_hash, role, department_id, batch, semester)
      VALUES (?, ?, ?, 'faculty', ?, NULL, NULL)`,
      [full_name, email, hash, department_id]
    );

    const [rows] = await pool.query(
      `SELECT
      u.id, u.full_name, u.email, u.role, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Faculty account created successfully',
      user: rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};