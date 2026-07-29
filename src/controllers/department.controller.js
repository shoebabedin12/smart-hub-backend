const pool = require("../db/pool");

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name
      FROM departments
      ORDER BY name ASC
    `);

    console.log("ROWS =", rows);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
