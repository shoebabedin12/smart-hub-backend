const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM departments ORDER BY name ASC');
    
    const deptList = rows.map(r => r.name);
    
    res.json(deptList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/add', async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO departments (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Department added successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/delete', async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('DELETE FROM departments WHERE name = ?', [name]);
    res.json({ message: 'Department removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;