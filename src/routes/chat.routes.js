const router = require('express').Router();
const ctrl   = require('../controllers/chat.controller');
const auth   = require('../middleware/auth.middleware');

router.post('/ask',                  auth, ctrl.ask);
router.get('/sessions',              auth, ctrl.sessions);
router.get('/history/:session_id',   auth, ctrl.history);

module.exports = router;