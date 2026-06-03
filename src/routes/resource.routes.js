const router  = require('express').Router();
const ctrl    = require('../controllers/resource.controller');
const auth    = require('../middleware/auth.middleware');
const role    = require('../middleware/role.middleware');

const multer  = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'resources-files', 
    resource_type: 'auto',     
  },
});

const upload = multer({ storage });

// Routes
router.get('/',       auth, ctrl.getAll);

router.post('/',      auth, role('faculty','admin'), upload.single('file'), ctrl.upload);
router.delete('/:id', auth, role('faculty','admin'), ctrl.remove);

module.exports = router;