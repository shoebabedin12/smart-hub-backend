const express = require('express');
const router = express.Router();
const ctrl   = require('../controllers/auth.controller');
const auth   = require('../middleware/auth.middleware');

// test route
router.get('/', (req, res) => {
  res.json({ message: "Auth route working" });
});
router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        auth, ctrl.me);

module.exports = router;