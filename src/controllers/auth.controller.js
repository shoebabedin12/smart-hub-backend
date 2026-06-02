const pool    = require('../db/pool');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { full_name, email, password, role, department, batch } = req.body;

  if (!full_name || !email || !password || !department || !batch) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    // FIX 1: MySQL style destructuring
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    // FIX 2: MySQL INSERT (no RETURNING)
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, department, batch)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, hash, role || 'student', department, batch]
    );

    // FIX 3: fetch inserted user again
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, department, batch FROM users WHERE email = ?',
      [email]
    );

    res.status(201).json({
      message: 'Registered successfully',
      user: rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        department: user.department,
        full_name: user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        batch: user.batch,
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, department, created_at FROM users WHERE id=?',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};