const pool = require("../db/pool");

exports.getMyResults = async (req, res) => {
  try {
    // ============================
    // Student নিজের result দেখবে
    // ============================
    if (req.user && req.user.role === "student") {
      const [rows] = await pool.query(
        `
        SELECT 
          r.*,
          u.full_name AS student_name
        FROM results r
        JOIN users u 
          ON r.student_id = u.id
        WHERE r.student_id = ?
        ORDER BY r.semester, r.subject
        `,
        [req.user.id],
      );

      return res.json({
        students: [],
        results: rows,
      });
    }

    const { student_id, department_id, batch } = req.query;

    // ============================
    // Student select করলে result
    // ============================
    if (student_id) {
      const [rows] = await pool.query(
        `
        SELECT 
          r.*,
          u.full_name AS student_name
        FROM results r
        JOIN users u 
          ON r.student_id = u.id
        WHERE r.student_id = ?
        ORDER BY r.semester, r.subject
        `,
        [student_id],
      );

      return res.json({
        students: [],
        results: rows,
      });
    }

    // ============================
    // Batch select করলে students
    // ============================
    if (department_id && batch) {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          department_id,
          batch
        FROM users
        WHERE role='student'
        AND department_id=?
        AND batch=?
        ORDER BY full_name ASC
        `,
        [department_id, batch],
      );

      return res.json({
        students: rows,
        results: [],
        type: "students",
      });
    }

    // ============================
    // Department select করলে batches
    // ============================
    if (department_id) {
      const [rows] = await pool.query(
        `
        SELECT DISTINCT batch
        FROM users
        WHERE role='student'
        AND department_id=?
        AND batch IS NOT NULL
        ORDER BY batch DESC
        `,
        [department_id],
      );

      return res.json({
        batches: rows,
        results: [],
        type: "batches",
      });
    }

    // ============================
    // Default departments
    // ============================

    const [rows] = await pool.query(
      `
      SELECT 
        id,
        name
      FROM departments
      ORDER BY name ASC
      `,
    );

    return res.json({
      departments: rows,
      results: [],
      type: "departments",
    });
  } catch (error) {
    console.error("getMyResults Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
