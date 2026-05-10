const pool = require("../db/pool");
const fetch = require("node-fetch");
const path = require("path");

exports.upload = async (req, res) => {
  const { title, subject, semester, department } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const ext      = path.extname(file.originalname).replace('.', '').toLowerCase();
  const filePath = file.path.replace(/\\/g, '/');
  const fullPath = require('path').resolve(file.path).replace(/\\/g, '/');

  try {
    const result = await pool.query(
      `INSERT INTO resources (uploaded_by, title, file_path, file_type, subject, semester, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, title, filePath, ext, subject, semester || null, department]
    );
    const resource = result.rows[0];

    // Auto-index in background
    fetch(`${process.env.AI_SERVICE_URL}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resource.id, file_path: fullPath }),
    }).then(r => r.json())
      .then(d => console.log('Auto-index result:', d))
      .catch(e => console.error('Auto-index error:', e.message));

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  const { department, subject, semester } = req.query;
  let query = `SELECT r.*, u.full_name as uploader_name FROM resources r
               JOIN users u ON r.uploaded_by = u.id WHERE 1=1`;
  const params = [];
  if (department) {
    params.push(department);
    query += ` AND r.department=$${params.length}`;
  }
  if (subject) {
    params.push(subject);
    query += ` AND r.subject ILIKE $${params.length}`;
  }
  if (semester) {
    params.push(semester);
    query += ` AND r.semester=$${params.length}`;
  }
  query += " ORDER BY r.created_at DESC";

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM resources WHERE id=$1 AND uploaded_by=$2", [
      id,
      req.user.id,
    ]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
