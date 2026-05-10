const pool = require('../db/pool');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, department, batch, profile_photo, created_at
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { full_name, department, batch } = req.body;
  const photoPath = req.file
    ? req.file.path.replace(/\\/g, '/')
    : null;

  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name      = COALESCE($1, full_name),
        department     = COALESCE($2, department),
        batch          = COALESCE($3, batch),
        profile_photo  = COALESCE($4, profile_photo)
       WHERE id=$5
       RETURNING id, full_name, email, role, department, batch, profile_photo`,
      [full_name || null, department || null, batch || null, photoPath, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};