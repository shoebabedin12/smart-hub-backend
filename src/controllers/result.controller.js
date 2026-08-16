const pool = require("../db/pool");

// Standard grading scale — matches the pattern already present in the
// seeded results data (e.g. 85.50 -> A+/4.00, 67.50 -> B+/3.25).
function calculateGrade(marks) {
  if (marks >= 80) return { grade: "A+", cgpa: 4.0 };
  if (marks >= 75) return { grade: "A", cgpa: 3.75 };
  if (marks >= 70) return { grade: "A-", cgpa: 3.5 };
  if (marks >= 65) return { grade: "B+", cgpa: 3.25 };
  if (marks >= 60) return { grade: "B", cgpa: 3.0 };
  if (marks >= 55) return { grade: "B-", cgpa: 2.75 };
  if (marks >= 50) return { grade: "C+", cgpa: 2.5 };
  if (marks >= 45) return { grade: "C", cgpa: 2.25 };
  if (marks >= 40) return { grade: "D", cgpa: 2.0 };
  return { grade: "F", cgpa: 0.0 };
}

// ========================================
// ADD RESULT (admin/faculty only)
// ========================================
// Grade and CGPA are always computed server-side from marks — faculty
// only enters the mark, so grade/CGPA can never be mismatched or typo'd.
exports.addResult = async (req, res) => {
  const { student_id, subject, semester, exam_type, marks } = req.body;

  if (!student_id || !subject || !semester || marks === undefined || marks === null || marks === "") {
    return res.status(400).json({ message: "student_id, subject, semester and marks are required" });
  }

  const marksNum = Number(marks);
  if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
    return res.status(400).json({ message: "marks must be a number between 0 and 100" });
  }

  const { grade, cgpa } = calculateGrade(marksNum);

  try {
    // Pull the subject's code from the subjects master list, matched to
    // the student's own department, so it's never manually typed/wrong.
    const [studentRows] = await pool.query("SELECT department_id FROM users WHERE id = ?", [student_id]);
    const departmentId = studentRows[0]?.department_id;

    let subjectCode = null;
    if (departmentId) {
      const [subjectRows] = await pool.query(
        "SELECT code FROM subjects WHERE name = ? AND department_id = ?",
        [subject, departmentId]
      );
      subjectCode = subjectRows[0]?.code || null;
    }

    const [result] = await pool.query(
      `INSERT INTO results (student_id, subject, subject_code, semester, exam_type, marks, grade, cgpa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, subject, subjectCode, semester, exam_type || "Final", marksNum, grade, cgpa]
    );

    res.status(201).json({
      id: result.insertId,
      student_id,
      subject,
      subject_code: subjectCode,
      semester,
      exam_type: exam_type || "Final",
      marks: marksNum,
      grade,
      cgpa,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// DELETE RESULT (admin/faculty only)
// ========================================
exports.deleteResult = async (req, res) => {
  try {
    await pool.query("DELETE FROM results WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
