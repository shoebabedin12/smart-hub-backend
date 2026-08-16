const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  const semester = user.role === 'student' ? (user.semester || '7th') : null;
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name,
      full_name: user.full_name,
      batch: user.batch,
      semester
    },
    process.env.JWT_SECRET || 'your_fallback_secret',
    { expiresIn: '7d' }
  );
}

// REGISTER
// 🔒 Public self-registration can ONLY ever create a 'student' account.
// Any `role` field sent by the client is ignored — faculty accounts are
// created exclusively by an admin via createFaculty below, and admin
// accounts are never created through any API endpoint.
exports.register = async (req, res) => {
  const { full_name, email, password_hash } = req.body;

  if (!full_name || !email || !password_hash) {
    return res.status(400).json({
      message: 'All fields required'
    });
  }

  try {
    // 🔒 ADMISSION WHITELIST
    // Per the department's instruction, self-registration is only allowed
    // for an email the admin has already recorded from physical admission —
    // this is checked before anything else so an unrecognized email never
    // even gets as far as an OTP being sent. Department, batch and semester
    // are no longer collected from the student — they come from whatever
    // the admin recorded for this email at admission time, so there's no
    // chance of the two disagreeing.
    const [whitelisted] = await pool.query(
      'SELECT id, department_id, batch, semester FROM admission_whitelist WHERE email = ?',
      [email]
    );
    if (whitelisted.length === 0) {
      return res.status(403).json({
        message: 'This email is not on record with the admission office. Please contact administration if you believe this is a mistake.'
      });
    }
    const { department_id, batch, semester } = whitelisted[0];

    const [exists] = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = ?',
      [email]
    );

    // An email stuck at is_verified=0 means an earlier registration was
    // never completed — let it be retried instead of blocking the email
    // forever, since the account never became usable.
    if (exists.length > 0 && exists[0].is_verified) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const hash = await bcrypt.hash(password_hash, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    if (exists.length > 0) {
      await pool.query(
        `UPDATE users
         SET full_name = ?, password_hash = ?, department_id = ?, batch = ?, semester = ?,
             otp_code = ?, otp_expires_at = ?
         WHERE id = ?`,
        [full_name, hash, department_id, batch, semester || '7th', otp, otpExpiresAt, exists[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO users
        (full_name, email, password_hash, role, department_id, batch, semester, is_verified, otp_code, otp_expires_at)
        VALUES (?, ?, ?, 'student', ?, ?, ?, 0, ?, ?)`,
        [
          full_name,
          email,
          hash,
          department_id,
          batch,
          semester || '7th',
          otp,
          otpExpiresAt
        ]
      );
    }

    try {
      await sendOtpEmail(email, full_name, otp);
    } catch (mailErr) {
      console.error('OTP email send failed:', mailErr.message);
      return res.status(201).json({
        message: 'Registered, but the verification email could not be sent. Please use "Resend OTP" to try again.',
        email
      });
    }

    res.status(201).json({
      message: 'Registered successfully. Please check your email for a verification code.',
      email
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    if (!user.otp_code || user.otp_code !== otp || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await pool.query(
      `UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?`,
      [user.id]
    );

    const token = signToken(user);

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        batch: user.batch,
        semester: user.semester
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RESEND OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
      [otp, otpExpiresAt, user.id]
    );

    try {
      await sendOtpEmail(email, user.full_name, otp);
    } catch (mailErr) {
      console.error('OTP email send failed:', mailErr.message);
      return res.status(502).json({ message: 'Could not send the verification email. Please try again shortly.' });
    }

    res.json({ message: 'A new OTP has been sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in',
        needsVerification: true,
        email: user.email
      });
    }

    const token = signToken(user);
    const semester = user.role === 'student' ? (user.semester || '7th') : null;

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
        semester
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
      (full_name, email, password_hash, role, department_id, batch, semester, is_verified)
      VALUES (?, ?, ?, 'faculty', ?, NULL, NULL, 1)`,
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