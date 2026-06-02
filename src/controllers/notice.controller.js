const pool = require('../db/pool');
const fetch = require('node-fetch');

const summarize = async (body) => {
  try {
    const res = await fetch(`${process.env.AI_SERVICE_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body }),
    });
    const data = await res.json();
    return data.summary || null;
  } catch {
    return null;
  }
};

exports.getAll = async (req, res) => {
  const { department, category } = req.query;
  let query = `SELECT n.*, u.full_name as author_name FROM notices n
               JOIN users u ON n.author_id = u.id WHERE 1=1`;
  const params = [];
  if (department && department !== 'all') {
    params.push(department);
    query += ` AND (n.department=$${params.length} OR n.department='all')`;
  }
  if (category) {
    params.push(category);
    query += ` AND n.category=$${params.length}`;
  }
  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  const { title, body, category, department, is_pinned } = req.body;
  if (!title || !body || !category) {
    return res.status(400).json({ message: 'title, body, category required' });
  }
  try {
    const ai_summary = await summarize(body);
    const result = await pool.query(
      `INSERT INTO notices (author_id, title, body, ai_summary, category, department, is_pinned)
       VALUES (?,?,?,?,?,?,?) RETURNING *`,
      [req.user.id, title, body, ai_summary, category, department || 'all', is_pinned || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, body, category, department, is_pinned } = req.body;
  try {
    const ai_summary = body ? await summarize(body) : undefined;
    const result = await pool.query(
      `UPDATE notices SET title=?, body=?, category=?, department=?, is_pinned=?,
       ai_summary=COALESCE(?, ai_summary) WHERE id=? AND author_id=? RETURNING *`,
      [title, body, category, department, is_pinned, ai_summary, id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Notice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM notices WHERE id=? AND author_id=?', [id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};