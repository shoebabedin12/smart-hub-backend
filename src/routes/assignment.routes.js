const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// ⚠️ /manage আগে রাখতে হবে — নাহলে /:id এ চলে যাবে
router.get('/manage', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name as teacher_name,
              COUNT(s.id) as submission_count
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       GROUP BY a.id, u.full_name
       ORDER BY a.deadline ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student — নিজের assignments দেখবে
router.get('/', auth, async (req, res) => {
  const { department, batch } = req.query;
  try {
    const result = await pool.query(
      `SELECT a.*,
              u.full_name as teacher_name,
              EXISTS(
                SELECT 1 FROM assignment_submissions s
                WHERE s.assignment_id=a.id AND s.student_id=$3
              ) as submitted
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.department=$1 AND (a.batch=$2 OR a.batch IS NULL)
       ORDER BY a.deadline ASC`,
      [department, batch, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create assignment
router.post('/', auth, role('faculty', 'admin'), async (req, res) => {
  const { department, batch, subject, title, description, deadline } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO assignments (created_by, department, batch, subject, title, description, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, department, batch, subject, title, description, deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submissions list
router.get('/:id/submissions', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.full_name, u.email, u.batch, u.department
       FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark as submitted
router.post('/:id/submit', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, note)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id, req.body.note || null]
    );
    res.json({ message: 'Marked as submitted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM assignments WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;