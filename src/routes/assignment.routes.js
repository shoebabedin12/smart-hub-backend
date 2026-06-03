const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// ==========================================
// 🛑 ১. স্ট্যাটিক রাউটগুলো সবার উপরে থাকবে
// ==========================================

// ফ্যাকাল্টি বা এডমিনের ম্যানেজ পেজের ডাটা আনা
router.get('/manage', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name as teacher_name, d.name as department_name,
              COUNT(s.id) as submission_count
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       GROUP BY a.id, u.full_name, d.name
       ORDER BY a.deadline ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// স্টুডেন্টদের নিজেদের অ্যাসাইনমেন্ট লিস্ট দেখা
router.get('/', auth, async (req, res) => {
  const { department_id, batch } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name as teacher_name,
              EXISTS(
                SELECT 1 FROM assignment_submissions s
                WHERE s.assignment_id = a.id AND s.student_id = ?
              ) as submitted
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.department_id = ? AND (a.batch = ? OR a.batch IS NULL)
       ORDER BY a.deadline ASC`,
      [req.user.id, department_id, batch]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// নতুন অ্যাসাইনমেন্ট তৈরি করা
router.post('/', auth, role('faculty', 'admin'), async (req, res) => {
  const { department_id, batch, subject, title, description, deadline } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO assignments (created_by, department_id, batch, subject, title, description, deadline)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, department_id, batch, subject, title, description, deadline]
    );
    res.status(201).json({
      id: result.insertId,
      created_by: req.user.id,
      department_id, batch, subject, title, description, deadline
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==========================================
// 🎯 ২. ডাইনামিক রাউট (/:id) থাকবে সবার নিচে
// ==========================================

// নির্দিষ্ট অ্যাসাইনমেন্টের সাবমিশন লিস্ট দেখা
router.get('/:id/submissions', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.full_name, u.email, u.batch
       FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// অ্যাসাইনমেন্ট সাবমিট করা
router.post('/:id/submit', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT IGNORE INTO assignment_submissions (assignment_id, student_id, note)
       VALUES (?,?,?)`,
      [req.params.id, req.user.id, req.body.note || null]
    );
    res.json({ message: 'Marked as submitted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// অ্যাসাইনমেন্ট ডিলিট করা
router.delete('/:id', auth, role('faculty', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM assignments WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;