const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res) => {
  const { department } = req.query;
  
  if (!department) {
    return res.status(400).json({ message: 'Department name is required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT b.batch_name 
       FROM batches b
       JOIN departments d ON b.department_id = d.id
       WHERE d.name = ? 
       ORDER BY b.batch_name DESC`,
      [department]
    );
    
    const batchList = rows.map(r => r.batch_name);
    res.json(batchList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;