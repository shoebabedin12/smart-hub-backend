const router = require("express").Router();
const ctrl = require("../controllers/resource.controller");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ========================================
// UPLOAD DIRECTORY
// ========================================

const uploadDir = path.join(__dirname, "../uploads/resources");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ========================================
// MULTER CONFIGURATION
// ========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const name = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, name);
  },
});

const upload = multer({
  storage,
});

// ========================================
// ROUTES
// ========================================

// Get all resources
router.get("/", auth, ctrl.getAll);

// Upload resource
router.post(
  "/",
  auth,
  role("faculty", "admin"),
  upload.single("file"),
  ctrl.upload
);

// Delete resource
router.delete(
  "/:id",
  auth,
  role("faculty", "admin"),
  ctrl.remove
);

module.exports = router;