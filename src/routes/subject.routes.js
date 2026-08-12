const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

// Any logged-in user can read the subject list for a department
// (needed to populate dropdowns on the resource/routine/assignment forms).
router.get("/", auth, async (req, res) => {
  const { department_id } = req.query;

  if (!department_id) {
    return res.status(400).json({ message: "department_id is required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, code, department_id FROM subjects WHERE department_id = ? ORDER BY name ASC",
      [department_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Only admin can add or remove subjects.
router.post("/", auth, role("admin"), async (req, res) => {
  const { name, department_id, code } = req.body;

  if (!name || !department_id) {
    return res.status(400).json({ message: "name and department_id are required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO subjects (name, department_id, code) VALUES (?, ?, ?)",
      [name.trim(), department_id, code?.trim() || null]
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), department_id, code: code?.trim() || null });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "This subject already exists for this department" });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, role("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM subjects WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
