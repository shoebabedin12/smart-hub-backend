const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/', auth, ctrl.getMyResults);
router.post('/', auth, role('admin', 'faculty'), ctrl.addResult);
router.delete('/:id', auth, role('admin', 'faculty'), ctrl.deleteResult);

module.exports = router;