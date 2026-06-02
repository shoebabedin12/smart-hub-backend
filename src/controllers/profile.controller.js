const pool = require("../db/pool");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, department, batch, profile_photo, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, department, batch } = req.body;

    // Cloudinary URL (IMPORTANT FIX)
    const photoUrl = req.file?.path || null;

    await pool.query(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        department = COALESCE(?, department),
        batch = COALESCE(?, batch),
        profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`,
      [full_name || null, department || null, batch || null, photoUrl, req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, department, batch, profile_photo
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};