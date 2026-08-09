const pool = require("../db/pool");
const path = require("path");

// ========================================
// UPLOAD RESOURCE
// ========================================

exports.upload = async (req, res) => {
  const {
    title,
    subject,
    semester,
    department,
  } = req.body;

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
    // RESPONSE
    // ========================================

    res.status(201).json({
      message: "Resource uploaded successfully",
      resourceId,
      url: fileUrl,
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

  // ========================================
  // FILTER BY DEPARTMENT
  // ========================================

  if (department) {
    query += ` AND r.department = ?`;
    params.push(department);
  }

  // ========================================
  // FILTER BY SUBJECT
  // ========================================

  if (subject) {
    query += ` AND r.subject LIKE ?`;
    params.push(`%${subject}%`);
  }

  // ========================================
  // FILTER BY SEMESTER
  // ========================================

  if (semester) {
    query += ` AND r.semester = ?`;
    params.push(semester);
  }

  // ========================================
  // SORT
  // ========================================

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