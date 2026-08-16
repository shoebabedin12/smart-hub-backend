const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

// ==========================================
// SUBMISSION FILE UPLOAD (multer)
// ==========================================

const submissionUploadDir = path.join(__dirname, '../uploads/assignments');
if (!fs.existsSync(submissionUploadDir)) {
  fs.mkdirSync(submissionUploadDir, { recursive: true });
}

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
  let { department_id, batch } = req.query;
  let semester = null;

  // 🔒 SEMESTER ACCESS CONTROL
  // Students cannot pick their own department/batch/semester via query params —
  // always derive it server-side from their own profile, and only return assignments
  // tagged for their semester (or untagged/legacy rows, which stay visible to everyone).
  if (req.user?.role === 'student') {
    department_id = req.user.department_id;
    batch = req.user.batch;
    semester = req.user.semester;

    if (!department_id || !batch || !semester) {
      try {
        const [uRows] = await pool.query(
          'SELECT department_id, batch, semester FROM users WHERE id = ?',
          [req.user.id]
        );
        department_id = department_id || uRows[0]?.department_id;
        batch = batch || uRows[0]?.batch;
        semester = semester || uRows[0]?.semester;
      } catch {}
    }
  }

  if (!department_id) {
    return res.json([]);
  }

  try {
    let query = `SELECT a.*, u.full_name as teacher_name,
              EXISTS(
                SELECT 1 FROM assignment_submissions s
                WHERE s.assignment_id = a.id AND s.student_id = ?
              ) as submitted
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.department_id = ? AND (a.batch = ? OR a.batch IS NULL)`;
    const params = [req.user.id, department_id, batch];

    if (semester) {
      query += ` AND (LOWER(a.semester) = LOWER(?) OR a.semester IS NULL OR a.semester = '' OR LOWER(a.semester) = 'all')`;
      params.push(semester);
    }

    query += ` ORDER BY a.deadline ASC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// নতুন অ্যাসাইনমেন্ট তৈরি করা
router.post('/', auth, role('faculty', 'admin'), async (req, res) => {
  const { department_id, batch, semester, subject, title, description, deadline } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO assignments (created_by, department_id, batch, semester, subject, title, description, deadline)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, department_id, batch, semester || null, subject, title, description, deadline]
    );
    res.status(201).json({
      id: result.insertId,
      created_by: req.user.id,
      department_id, batch, semester, subject, title, description, deadline
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

// অ্যাসাইনমেন্ট সাবমিট করা (ফাইল সহ)
router.post('/:id/submit', auth, uploadSubmission.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A file is required to submit the assignment' });
  }

  const filePath = `/uploads/assignments/${req.file.filename}`;
  const fileName = req.file.originalname;

  try {
    await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, note, file_path, file_name)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         note = VALUES(note),
         file_path = VALUES(file_path),
         file_name = VALUES(file_name),
         submitted_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.user.id, req.body.note || null, filePath, fileName]
    );
    res.json({ message: 'Submitted successfully', file_path: filePath, file_name: fileName });
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