const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');
const auth   = require('../middleware/auth.middleware');

router.get('/', auth, ctrl.getMyResults);

module.exports = router;