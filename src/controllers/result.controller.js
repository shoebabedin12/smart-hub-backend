const pool = require("../db/pool");

exports.getMyResults = async (req, res) => {
  try {
    // ১. স্টুডেন্ট লগইন করা থাকলে তার নিজের রেজাল্ট দাও
    if (req.user && req.user.role === 'student') {
      const [rows] = await pool.query(
        `SELECT r.*, u.full_name as student_name 
         FROM results r JOIN users u ON r.student_id = u.id
         WHERE r.student_id=? ORDER BY r.semester, r.subject`,
        [req.user.id]
      );
      return res.json({ students: [], results: rows });
    }

    const { student_id, department, batch } = req.query;

    // ২. এডমিন প্যানেল: Student select হলে তার রেজাল্ট দাও
    if (student_id) {
      const [rows] = await pool.query(
        `SELECT r.*, u.full_name as student_name 
         FROM results r JOIN users u ON r.student_id = u.id
         WHERE r.student_id=? ORDER BY r.semester, r.subject`,
        [student_id]
      );
      return res.json({ students: [], results: rows });
    }

    // ৩. এডমিন প্যানেল: Batch select হলে সেই batch এর students দাও
    if (department && batch) {
      const [rows] = await pool.query(
        `SELECT id, full_name, department, batch, email FROM users 
         WHERE role='student' AND department=? AND batch=? ORDER BY full_name`,
        [department, batch]
      );
      return res.json({ students: rows, results: [], type: 'students' });
    }

    // ৪. এডমিন প্যানেল: Department select হলে সেই department এর batches দাও
    if (department) {
      const [rows] = await pool.query(
        `SELECT DISTINCT batch FROM users 
         WHERE role='student' AND department=? AND batch IS NOT NULL ORDER BY batch`,
        [department]
      );
      return res.json({ batches: rows.map(b => b.batch), results: [], type: 'batches' });
    }

    // ৫. Default: সব departments দাও
    const [rows] = await pool.query(
      `SELECT DISTINCT department FROM users WHERE role='student' AND department IS NOT NULL ORDER BY department`
    );
    return res.json({ departments: rows.map(d => d.department), results: [], type: 'departments' });

  } catch (err) {
    console.error("Error in getMyResults:", err);
    res.status(500).json({ message: err.message });
  }
};