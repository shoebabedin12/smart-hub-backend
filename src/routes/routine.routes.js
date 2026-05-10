const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// Get routine — student নিজের department+batch অনুযায়ী, admin যেকোনো
router.get('/', auth, async (req, res) => {
  const { department, batch } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM class_routine
       WHERE department=$1 AND batch=$2
       ORDER BY
         CASE day_of_week
           WHEN 'Sunday'    THEN 1
           WHEN 'Monday'    THEN 2
           WHEN 'Tuesday'   THEN 3
           WHEN 'Wednesday' THEN 4
           WHEN 'Thursday'  THEN 5
         END, start_time`,
      [department, batch]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add class (admin/faculty only)
router.post('/', auth, role('admin', 'faculty'), async (req, res) => {
  const { department, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO class_routine (department, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [department, batch, day_of_week, start_time, end_time, subject, subject_code, teacher, room]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete class (admin only)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM class_routine WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;