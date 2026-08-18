const pool = require("../db/pool");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.batch, u.semester, u.profile_photo, 
              u.department_id, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id],
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
    const { full_name, department_id, batch, semester } = req.body;
    const isStudent = req.user.role === "student";

    // Cloudinary URL
    const profile_photo = req.file?.path || null;

    // Students can't change department/batch/semester directly here — those
    // go through the profile-change-request + admin-approval flow instead
    // (see profileRequest.controller.js). Faculty/admin keep editing them
    // directly as before.
    const deptId =
      !isStudent && department_id && department_id !== "undefined"
        ? Number(department_id)
        : null;
    const batchVal = !isStudent ? batch || null : null;
    const semesterVal = !isStudent ? semester || null : null;

    await pool.query(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        department_id = COALESCE(?, department_id),
        batch = COALESCE(?, batch),
        semester = COALESCE(?, semester),
        profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`,
      [full_name || null, deptId, batchVal, semesterVal, profile_photo, req.user.id],
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.batch, u.semester, u.department_id, d.name as department_name, u.profile_photo
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
