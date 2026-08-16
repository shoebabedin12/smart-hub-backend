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
  const { department_id, category } = req.query;
  
  // d.name সহ জয়েন করা হলো যাতে ভবিষ্যতে ডিপার্টমেন্টের নামও ফ্রন্টএন্ডে দেখাতে পারেন
  let query = `SELECT n.*, u.full_name as author_name, d.name as department_name 
               FROM notices n
               JOIN users u ON n.author_id = u.id 
               LEFT JOIN departments d ON n.department_id = d.id
               WHERE 1=1`;
  const params = [];

  // 🛠️ লজিক ফিক্স: আইডি যদি 'all' না হয় এবং ০ এর চেয়ে বড় হয়, কেবল তখনই ফিল্টার হবে
  if (department_id && department_id !== 'all' && String(department_id) !== '0') {
    query += ` AND (n.department_id = ? OR n.department_id IS NULL)`;
    params.push(Number(department_id));
  }
  
  // ক্যাটেগরি ফিল্টার
  if (category && category !== 'all') {
    query += ` AND LOWER(n.category) = LOWER(?)`;
    params.push(category);
  }
  
  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Database Query Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  const { title, body, category, department_id, is_pinned } = req.body;
  if (!title || !body || !category) {
    return res.status(400).json({ message: 'title, body, category required' });
  }
  try {
    const ai_summary = await summarize(body);
    
    // 🛠️ department_id যদি 'all' বা খালি হয়, তবে ডাটাবেজে NULL সেভ হবে (সবার জন্য নোটিশ)
    const deptId = (!department_id || department_id === 'all') ? null : Number(department_id);

    // multipart/form-data sends every field as a string, so is_pinned="false"
    // would otherwise be truthy — handle both boolean and string forms.
    const pinned = is_pinned === true || is_pinned === 'true' ? 1 : 0;

    const filePath = req.file ? `/uploads/notices/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;

    const [result] = await pool.query(
      `INSERT INTO notices (author_id, title, body, ai_summary, category, department_id, is_pinned, file_path, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, body, ai_summary, category, deptId, pinned, filePath, fileName]
    );

    const [newNotice] = await pool.query(
      'SELECT n.*, u.full_name as author_name FROM notices n JOIN users u ON n.author_id = u.id WHERE n.id = ?', 
      [result.insertId]
    );
    res.status(201).json(newNotice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, body, category, department, is_pinned } = req.body;
  try {
    const ai_summary = body ? await summarize(body) : undefined;
    
    await pool.query(
      `UPDATE notices SET title=?, body=?, category=?, department=?, is_pinned=?,
       ai_summary=COALESCE(?, ai_summary) WHERE id=? AND author_id=?`,
      [title, body, category, department, is_pinned ? 1 : 0, ai_summary, id, req.user.id]
    );

    const [updatedNotice] = await pool.query('SELECT n.*, u.full_name as author_name FROM notices n JOIN users u ON n.author_id = u.id WHERE n.id = ?', [id]);
    if (!updatedNotice.length) return res.status(404).json({ message: 'Notice not found' });
    
    res.json(updatedNotice);
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

exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM notices WHERE category IS NOT NULL');
    const categories = rows.map(r => r.category);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    // সরাসরি departments টেবিল থেকে id এবং name তুলে আনা হচ্ছে
    const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
    res.json(rows); // এটি [{id: 1, name: 'CSE'}, {id: 2, name: 'EEE'}] এমন ডাটা রিটার্ন করবে
  } catch (err) {
    console.error("getDepartments Error:", err);
    res.status(500).json({ message: err.message });
  }
};