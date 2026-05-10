const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');

router.get('/', auth, async (req, res) => {
  const { role } = req.query;
  try {
    let query = `SELECT id, full_name, email, role, department FROM users WHERE role != 'student' AND role != 'admin'`;
    const params = [];
    if (role) { 
      params.push(role); 
      query = `SELECT id, full_name, email, role, department FROM users WHERE role=$1`;
    }
    query += ' ORDER BY full_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;