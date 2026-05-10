const pool = require("../db/pool");

exports.getMyResults = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const result = await pool.query(
        `SELECT r.*, u.full_name as student_name 
         FROM results r JOIN users u ON r.student_id = u.id
         WHERE r.student_id=$1 ORDER BY r.semester, r.subject`,
        [req.user.id]
      );
      return res.json({ students: [], results: result.rows });
    }

    const { student_id, department, batch } = req.query;

    // Student select হলে result দাও
    if (student_id) {
      const result = await pool.query(
        `SELECT r.*, u.full_name as student_name 
         FROM results r JOIN users u ON r.student_id = u.id
         WHERE r.student_id=$1 ORDER BY r.semester, r.subject`,
        [student_id]
      );
      return res.json({ students: [], results: result.rows });
    }

    // Batch select হলে সেই batch এর students দাও
    if (department && batch) {
      const students = await pool.query(
        `SELECT id, full_name, department, batch, email FROM users 
         WHERE role='student' AND department=$1 AND batch=$2 ORDER BY full_name`,
        [department, batch]
      );
      return res.json({ students: students.rows, results: [], type: 'students' });
    }

    // Department select হলে সেই department এর batches দাও
    if (department) {
      const batches = await pool.query(
        `SELECT DISTINCT batch FROM users 
         WHERE role='student' AND department=$1 AND batch IS NOT NULL ORDER BY batch`,
        [department]
      );
      return res.json({ batches: batches.rows.map(b => b.batch), results: [], type: 'batches' });
    }

    // Default: departments দাও
    const departments = await pool.query(
      `SELECT DISTINCT department FROM users WHERE role='student' AND department IS NOT NULL ORDER BY department`
    );
    return res.json({ departments: departments.rows.map(d => d.department), results: [], type: 'departments' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
