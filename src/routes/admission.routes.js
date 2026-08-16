const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// Admin-only: list the admission whitelist, with optional search and
// filters (department, semester, batch, registration status). Each row
// also reports whether that email has actually completed self-registration
// as a student — joined against `users` (scoped to role='student', since
// self-registration is the only path this whitelist gates; an admin
// creating a faculty account with the same email through the separate
// createFaculty flow should never read back as "registered" here) rather
// than stored, so it always reflects the current state.
router.get('/', auth, role('admin'), async (req, res) => {
  const { q, department_id, semester, batch, status } = req.query;
  try {
    let query = `
      SELECT w.id, w.email, w.full_name, w.student_id, w.department_id, w.batch, w.semester, w.phone, w.created_at,
             d.name AS department_name,
             CASE WHEN u.id IS NOT NULL AND u.is_verified = 1 THEN 1 ELSE 0 END AS registered
      FROM admission_whitelist w
      LEFT JOIN departments d ON w.department_id = d.id
      LEFT JOIN users u ON u.email = w.email COLLATE utf8mb4_general_ci AND u.role = 'student'
      WHERE 1=1`;
    const params = [];

    if (q) {
      query += ' AND (w.email LIKE ? OR w.full_name LIKE ? OR w.student_id LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (department_id) {
      query += ' AND w.department_id = ?';
      params.push(department_id);
    }
    if (semester) {
      query += ' AND w.semester = ?';
      params.push(semester);
    }
    if (batch) {
      query += ' AND w.batch = ?';
      params.push(batch);
    }
    if (status === 'registered') {
      query += ' AND u.id IS NOT NULL AND u.is_verified = 1';
    } else if (status === 'unregistered') {
      query += ' AND (u.id IS NULL OR u.is_verified = 0)';
    }

    query += ' ORDER BY w.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a single admitted student's record.
router.post('/', auth, role('admin'), async (req, res) => {
  const { email, full_name, student_id, department_id, batch, semester, phone } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'email is required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO admission_whitelist (email, full_name, student_id, department_id, batch, semester, phone, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.trim().toLowerCase(),
        full_name?.trim() || null,
        student_id?.trim() || null,
        department_id || null,
        batch?.trim() || null,
        semester?.trim() || null,
        phone?.trim() || null,
        req.user.id,
      ]
    );
    res.status(201).json({ id: result.insertId, email: email.trim().toLowerCase() });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This email is already on the admission list' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM admission_whitelist WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
