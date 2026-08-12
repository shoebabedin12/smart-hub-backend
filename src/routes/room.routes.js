const router = require("express").Router();
const pool = require("../db/pool");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

// Any logged-in user can read the room list (needed to populate the
// Room dropdown on the routine form).
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, room_number FROM rooms ORDER BY room_number ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Only admin can add or remove rooms.
router.post("/", auth, role("admin"), async (req, res) => {
  const { room_number } = req.body;

  if (!room_number || !room_number.trim()) {
    return res.status(400).json({ message: "room_number is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO rooms (room_number) VALUES (?)",
      [room_number.trim()]
    );
    res.status(201).json({ id: result.insertId, room_number: room_number.trim() });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "This room already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, role("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM rooms WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
