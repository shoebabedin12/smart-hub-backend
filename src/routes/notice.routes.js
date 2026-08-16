const router = require('express').Router();
const ctrl   = require('../controllers/notice.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

// ==========================================
// NOTICE ATTACHMENT UPLOAD (multer)
// ==========================================

const noticeUploadDir = path.join(__dirname, '../uploads/notices');
if (!fs.existsSync(noticeUploadDir)) {
  fs.mkdirSync(noticeUploadDir, { recursive: true });
}

const noticeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, noticeUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadNoticeFile = multer({
  storage: noticeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Read-only routes are public — the Notice Board is meant to be browsable
// like a normal university site whether or not a visitor is signed in.
router.get('/categories', ctrl.getCategories);
router.get('/departments', ctrl.getDepartments);
router.get('/',           ctrl.getAll);

router.post('/',       auth, role('faculty','admin'), uploadNoticeFile.single('file'), ctrl.create);
router.put('/:id',     auth, role('faculty','admin'), ctrl.update);
router.delete('/:id',  auth, role('faculty','admin'), ctrl.remove);

module.exports = router;