const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// Only faculty/admin may list staff (e.g. to populate a teacher dropdown).
// Students and admins are always excluded from the result, regardless of
// the `role` filter, so this can never be used to enumerate the student body.
router.get('/', auth, role('faculty', 'admin'), async (req, res) => {
  const { role: roleFilter } = req.query;
  try {
    // Join departments via department_id — the legacy `users.department`
    // text column is always NULL and was never actually populated.
    let query = `
      SELECT u.id, u.full_name, u.email, u.role, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role != 'student' AND u.role != 'admin'
    `;
    const params = [];
    if (roleFilter) {
      query += ' AND u.role = ?';
      params.push(roleFilter);
    }
    query += ' ORDER BY u.full_name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;