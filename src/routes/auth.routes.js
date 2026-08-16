const express = require('express');
const router = express.Router();
const ctrl   = require('../controllers/auth.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// test route
router.get('/', (req, res) => {
  res.json({ message: "Auth route working" });
});
router.post('/register',        ctrl.register);
router.post('/verify-otp',      ctrl.verifyOtp);
router.post('/resend-otp',      ctrl.resendOtp);
router.post('/login',           ctrl.login);
router.get('/me',               auth, ctrl.me);
router.post('/create-faculty',  auth, role('admin'), ctrl.createFaculty);

module.exports = router;