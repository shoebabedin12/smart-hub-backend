const router = require('express').Router();
const ctrl = require('../controllers/profile.controller');
const auth = require('../middleware/auth.middleware');

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profile-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage });

// routes
router.get('/', auth, ctrl.getProfile);
router.put('/', auth, upload.single('photo'), ctrl.updateProfile);

module.exports = router;