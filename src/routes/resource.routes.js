const router  = require('express').Router();
const ctrl    = require('../controllers/resource.controller');
const auth    = require('../middleware/auth.middleware');
const role    = require('../middleware/role.middleware');
const multer  = require('multer');
const path    = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/',       auth, ctrl.getAll);
router.post('/',      auth, role('faculty','admin'), upload.single('file'), ctrl.upload);
router.delete('/:id', auth, role('faculty','admin'), ctrl.remove);

module.exports = router;