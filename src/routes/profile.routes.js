const router  = require('express').Router();
const ctrl    = require('../controllers/profile.controller');
const auth    = require('../middleware/auth.middleware');
const multer  = require('multer');
const path    = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/',  auth, ctrl.getProfile);
router.put('/',  auth, upload.single('photo'), ctrl.updateProfile);

module.exports = router;