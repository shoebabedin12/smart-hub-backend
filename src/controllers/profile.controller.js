const pool = require("../db/pool");
const path = require("path");

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, department, batch, profile_photo, created_at
       FROM users WHERE id = ?`,
      [req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { full_name, department, batch } = req.body;

  const photoPath = req.file?.path || null;

  try {
    await pool.query(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        department = COALESCE(?, department),
        batch = COALESCE(?, batch),
        profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`,
      [full_name || null, department || null, batch || null, photoPath, req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, department, batch, profile_photo
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
