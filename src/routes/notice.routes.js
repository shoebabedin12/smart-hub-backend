const router = require('express').Router();
const ctrl   = require('../controllers/notice.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/',       auth, ctrl.getAll);
router.post('/',      auth, role('faculty','admin'), ctrl.create);
router.put('/:id',    auth, role('faculty','admin'), ctrl.update);
router.delete('/:id', auth, role('faculty','admin'), ctrl.remove);

module.exports = router;