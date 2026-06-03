const pool = require("../db/pool");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
  `SELECT u.id, u.full_name, u.email, u.role, u.batch, u.profile_photo, 
          u.department_id, d.name as department_name
   FROM users u
   LEFT JOIN departments d ON u.department_id = d.id
   WHERE u.id = ?`,
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

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, department_id, batch } = req.body;

    // Cloudinary URL (IMPORTANT FIX)
    const photoUrl = req.file?.path || null;

    await pool.query(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        department_id = COALESCE(?, department_id),
        batch = COALESCE(?, batch),
        profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`,
      [full_name || null, department_id || null, batch || null, photoUrl, req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.batch, u.department_id, d.name as department_name, u.profile_photo
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};