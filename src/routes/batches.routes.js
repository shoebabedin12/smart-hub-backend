const router = require("express").Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  const { department_id } = req.query;

  if (!department_id) {
    return res.status(400).json({
      message: "Department id is required",
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        b.batch_name
      FROM batches b
      WHERE b.department_id = ?
      ORDER BY b.batch_name DESC
      `,
      [department_id],
    );

    const batchList = rows.map((r) => r.batch_name);

    res.json({
      batches: batchList,
    });
  } catch (err) {
    console.error("Batch fetch error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;
