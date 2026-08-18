const pool = require("../db/pool");

// STUDENT: submit a request to change department/batch/semester
exports.create = async (req, res) => {
  const { department_id, batch, semester } = req.body;

  if (!department_id && !batch && !semester) {
    return res.status(400).json({ message: "Provide at least one field to change (department, batch, or semester)" });
  }

  try {
    const [pending] = await pool.query(
      `SELECT id FROM profile_change_requests WHERE user_id = ? AND status = 'pending'`,
      [req.user.id],
    );
    if (pending.length) {
      return res.status(409).json({ message: "You already have a pending request. Please wait for it to be reviewed." });
    }

    const deptId = department_id && department_id !== "all" ? Number(department_id) : null;

    const [result] = await pool.query(
      `INSERT INTO profile_change_requests (user_id, department_id, batch, semester) VALUES (?, ?, ?, ?)`,
      [req.user.id, deptId, batch || null, semester || null],
    );

    const [rows] = await pool.query(
      `SELECT r.*, d.name as department_name FROM profile_change_requests r
       LEFT JOIN departments d ON r.department_id = d.id WHERE r.id = ?`,
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// STUDENT: view their own recent requests (so the UI can show pending/rejected state)
exports.getMine = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, d.name as department_name FROM profile_change_requests r
       LEFT JOIN departments d ON r.department_id = d.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 5`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: list all requests, optionally filtered by status
exports.list = async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT r.*, d.name as requested_department_name,
             u.full_name as student_name, u.email as student_email,
             u.department_id as current_department_id, cd.name as current_department_name,
             u.batch as current_batch, u.semester as current_semester,
             rv.full_name as reviewed_by_name
      FROM profile_change_requests r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN departments cd ON u.department_id = cd.id
      LEFT JOIN users rv ON r.reviewed_by = rv.id
      WHERE 1=1`;
    const params = [];
    if (status && status !== "all") {
      query += " AND r.status = ?";
      params.push(status);
    }
    query += " ORDER BY (r.status = 'pending') DESC, r.created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: approve — copies the requested fields onto the user's row
exports.approve = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT * FROM profile_change_requests WHERE id = ?`, [id]);
    const reqRow = rows[0];
    if (!reqRow) return res.status(404).json({ message: "Request not found" });
    if (reqRow.status !== "pending") return res.status(409).json({ message: "Request has already been reviewed" });

    await pool.query(
      `UPDATE users SET
         department_id = COALESCE(?, department_id),
         batch = COALESCE(?, batch),
         semester = COALESCE(?, semester)
       WHERE id = ?`,
      [reqRow.department_id, reqRow.batch, reqRow.semester, reqRow.user_id],
    );

    await pool.query(
      `UPDATE profile_change_requests SET status='approved', reviewed_by=?, reviewed_at=NOW() WHERE id=?`,
      [req.user.id, id],
    );

    res.json({ message: "Request approved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: reject — leaves the user's row untouched
exports.reject = async (req, res) => {
  const { id } = req.params;
  const { review_note } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE profile_change_requests SET status='rejected', review_note=?, reviewed_by=?, reviewed_at=NOW()
       WHERE id=? AND status='pending'`,
      [review_note || null, req.user.id, id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pending request not found" });
    }
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
