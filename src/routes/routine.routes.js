const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// ১. ডাইনামিক ব্যাচ লিস্ট আনা
router.get('/batches', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT batch FROM users WHERE batch IS NOT NULL AND batch != '' ORDER BY batch DESC"
    );
    const batches = rows.map(r => r.batch);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ২. Get routine — JOIN কুয়েরি দিয়ে department_id অনুযায়ী ডেটা আনা হচ্ছে
router.get('/', auth, async (req, res) => {
  let { department_id, batch } = req.query; // 👈 query-তে এখন department_id আসবে
  let semester = null;

  // 🔒 SEMESTER ACCESS CONTROL
  // Students cannot pick their own department/batch/semester via query params —
  // always derive it server-side from their own profile, and only return classes
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
  } else if (req.user?.role === 'faculty') {
    // 🔒 Faculty can only browse their own department's routine —
    // only admin may pass an arbitrary department_id.
    department_id = req.user.department_id;
    if (!department_id) {
      try {
        const [uRows] = await pool.query('SELECT department_id FROM users WHERE id = ?', [req.user.id]);
        department_id = uRows[0]?.department_id;
      } catch {}
    }
  }

  if (!department_id || !batch) {
    return res.json([]);
  }

  try {
    let query = `SELECT cr.*, d.name as department_name
       FROM class_routine cr
       JOIN departments d ON cr.department_id = d.id
       WHERE cr.department_id = ? AND cr.batch = ?`;
    const params = [department_id, batch];

    if (semester) {
      query += ` AND (LOWER(cr.semester) = LOWER(?) OR cr.semester IS NULL OR cr.semester = '' OR LOWER(cr.semester) = 'all')`;
      params.push(semester);
    }

    query += ` ORDER BY
         CASE cr.day_of_week
           WHEN 'Sunday'    THEN 1
           WHEN 'Monday'    THEN 2
           WHEN 'Tuesday'   THEN 3
           WHEN 'Wednesday' THEN 4
           WHEN 'Thursday'  THEN 5
           WHEN 'Friday'    THEN 6
           WHEN 'Saturday'  THEN 7
         END, cr.start_time`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ৩. Add class — এখন department_id ও semester ইনসার্ট হবে
router.post('/', auth, role('admin', 'faculty'), async (req, res) => {
  const { batch, semester, day_of_week, start_time, end_time, subject, subject_code, teacher, room } = req.body;
  let { department_id } = req.body;

  // 🔒 DEPARTMENT LOCK
  // Faculty can only ever add classes for their own department — the
  // client-supplied department_id is ignored for anyone who isn't admin.
  if (req.user.role !== 'admin') {
    department_id = req.user.department_id;
    if (!department_id) {
      try {
        const [uRows] = await pool.query('SELECT department_id FROM users WHERE id = ?', [req.user.id]);
        department_id = uRows[0]?.department_id || null;
      } catch {}
    }
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO class_routine (department_id, batch, semester, day_of_week, start_time, end_time, subject, subject_code, teacher, room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [department_id, batch, semester || null, day_of_week, start_time, end_time, subject, subject_code, teacher, room]
    );

    res.status(201).json({
      id: result.insertId,
      department_id, batch, semester, day_of_week, start_time, end_time, subject, subject_code, teacher, room
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ৪. Delete class
// Admin can delete any class. Faculty can only delete classes belonging
// to their own department — enforced with the WHERE clause below, not
// just at the route-permission level.
router.delete('/:id', auth, role('admin', 'faculty'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await pool.query('DELETE FROM class_routine WHERE id=?', [req.params.id]);
    } else {
      let departmentId = req.user.department_id;
      if (!departmentId) {
        const [uRows] = await pool.query('SELECT department_id FROM users WHERE id = ?', [req.user.id]);
        departmentId = uRows[0]?.department_id;
      }
      const [result] = await pool.query(
        'DELETE FROM class_routine WHERE id=? AND department_id=?',
        [req.params.id, departmentId]
      );
      if (result.affectedRows === 0) {
        return res.status(403).json({ message: 'You can only delete classes for your own department' });
      }
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
