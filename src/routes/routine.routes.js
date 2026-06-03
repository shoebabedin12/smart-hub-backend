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

// ২. Get routine — JOIN কুয়েরি দিয়ে department_id অনুযায়ী ডেটা আনা হচ্ছে
router.get('/', auth, async (req, res) => {
  const { department_id, batch } = req.query; // 👈 query-তে এখন department_id আসবে
  try {
    const [rows] = await pool.query(
      `SELECT cr.*, d.name as department_name 
       FROM class_routine cr
       JOIN departments d ON cr.department_id = d.id
       WHERE cr.department_id = ? AND cr.batch = ?
       ORDER BY 
         CASE cr.day_of_week
           WHEN 'Sunday'    THEN 1
           WHEN 'Monday'    THEN 2
           WHEN 'Tuesday'   THEN 3
           WHEN 'Wednesday' THEN 4
           WHEN 'Thursday'  THEN 5
           WHEN 'Friday'    THEN 6
           WHEN 'Saturday'  THEN 7
         END, cr.start_time`,
      [department_id, batch]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ৩. Add class — এখন department_id ইনসার্ট হবে
router.post('/', auth, role('admin', 'faculty'), async (req, res) => {
  const { department_id, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO class_routine (department_id, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [department_id, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      department_id, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ৪. Delete class
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM class_routine WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;