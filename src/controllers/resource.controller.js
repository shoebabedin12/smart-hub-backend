const pool = require("../db/pool");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ========================================
// UPLOAD RESOURCE
// ========================================

exports.upload = async (req, res) => {
  const {
    title,
    subject,
    semester,
  } = req.body;
  let { department } = req.body;

  // Validate title
  if (!title) {
    return res.status(400).json({
      message: "Title is required",
    });
  }

  // Validate file
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  try {
    // 🔒 DEPARTMENT LOCK
    // Faculty can only ever upload resources tagged with their own
    // department — the client-supplied `department` is ignored for
    // anyone who isn't an admin, and derived server-side instead.
    if (req.user.role !== "admin") {
      department = req.user.department_name;
      if (!department) {
        const [uRows] = await pool.query(
          `SELECT d.name FROM users u
           LEFT JOIN departments d ON u.department_id = d.id
           WHERE u.id = ?`,
          [req.user.id]
        );
        department = uRows[0]?.name || null;
      }
    }

    // ========================================
    // PUBLIC FILE PATH
    // ========================================
    //
    // IMPORTANT:
    // req.file.path gives the physical server path.
    //
    // Example:
    // /home/shoebabe/.../src/uploads/resources/file.pdf
    //
    // We DON'T save that to database.
    //
    // Instead we save:
    // /uploads/resources/file.pdf
    //

    const fileUrl = `/uploads/resources/${req.file.filename}`;

    // ========================================
    // FILE TYPE
    // ========================================

    const fileType = req.file.originalname
      ? path
          .extname(req.file.originalname)
          .replace(".", "")
          .toLowerCase()
      : "unknown";

    console.log(
      "Saving to DB - Public Path:",
      fileUrl
    );

    console.log(
      "Physical File Path:",
      req.file.path
    );

    console.log(
      "File Type:",
      fileType
    );

    // ========================================
    // INSERT INTO DATABASE
    // ========================================

    const [dbResult] = await pool.query(
      `INSERT INTO resources
      (
        uploaded_by,
        title,
        file_path,
        file_type,
        subject,
        semester,
        department
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        fileUrl,
        fileType,
        subject || null,
        semester || null,
        department || null,
      ]
    );

    const resourceId = dbResult.insertId;

    // ========================================
    // INDEX INTO THE AI SERVICE (FAISS)
    // ========================================
    //
    // So the RAG chat can answer questions from this file's content.
    // The AI service downloads the file over HTTP, so it needs a fully
    // qualified URL, not the relative path we store in the DB.
    //
    // Indexing failure must not fail the upload itself — the resource
    // is still valid to browse/download even if search over it doesn't
    // work yet.

    let indexed = false;
    try {
      const publicFileUrl = `${req.protocol}://${req.get("host")}${fileUrl}`;

      const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/index-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: publicFileUrl,
          resource_id: resourceId,
        }),
      });

      indexed = aiRes.ok;
      if (!indexed) {
        console.error("AI indexing failed:", await aiRes.text());
      }
    } catch (indexErr) {
      console.error("AI indexing request error:", indexErr.message);
    }

    // ========================================
    // RESPONSE
    // ========================================

    res.status(201).json({
      message: "Resource uploaded successfully",
      resourceId,
      url: fileUrl,
      indexed,
    });
  } catch (err) {
    console.error(
      "Upload Controller Error:",
      err
    );

    res.status(500).json({
      message: err.message,
    });
  }
};

// ========================================
// GET ALL RESOURCES
// ========================================

exports.getAll = async (req, res) => {
  const {
    department,
    subject,
    semester,
  } = req.query;

  let query = `
    SELECT
      r.*,
      u.full_name AS uploader_name
    FROM resources r
    JOIN users u
      ON r.uploaded_by = u.id
    WHERE 1=1
  `;

  const params = [];

  // 🔒 DEPARTMENT & SEMESTER ACCESS CONTROL
  // Students always see only their own department + semester (or
  // untagged/'all' resources) — derived server-side from their profile,
  // never from client-supplied query params, so it can't be bypassed.
  let userDepartment = req.user?.department_name;
  let userSemester = req.user?.semester;
  if ((!userDepartment || !userSemester) && req.user?.id) {
    try {
      const [uRows] = await pool.query(
        `SELECT d.name AS department_name, u.semester
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = ?`,
        [req.user.id]
      );
      userDepartment = userDepartment || uRows[0]?.department_name;
      userSemester = userSemester || uRows[0]?.semester;
    } catch {}
  }

  if (req.user?.role === 'student') {
    if (userDepartment) {
      query += ` AND (LOWER(r.department) = LOWER(?) OR r.department IS NULL OR r.department = '' OR LOWER(r.department) = 'all')`;
      params.push(userDepartment);
    }
    if (userSemester) {
      query += ` AND (LOWER(r.semester) = LOWER(?) OR r.semester IS NULL OR r.semester = '' OR LOWER(r.semester) = 'all')`;
      params.push(userSemester);
    }
  } else {
    // FILTER BY DEPARTMENT
    if (department) {
      query += ` AND r.department = ?`;
      params.push(department);
    }

    // FILTER BY SEMESTER
    if (semester) {
      query += ` AND LOWER(r.semester) = LOWER(?)`;
      params.push(semester);
    }
  }

  // FILTER BY SUBJECT
  if (subject) {
    query += ` AND r.subject LIKE ?`;
    params.push(`%${subject}%`);
  }

  query += " ORDER BY r.created_at DESC";

  try {
    const [rows] = await pool.query(
      query,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error(
      "GetAll Error:",
      err
    );

    res.status(500).json({
      message: err.message,
    });
  }
};

// ========================================
// DELETE RESOURCE
// ========================================

exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM resources
       WHERE id = ?
       AND uploaded_by = ?`,
      [
        id,
        req.user.id,
      ]
    );

    res.json({
      message: "Deleted",
    });
  } catch (err) {
    console.error(
      "Remove Error:",
      err
    );

    res.status(500).json({
      message: err.message,
    });
  }
};