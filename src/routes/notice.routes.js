const router = require('express').Router();
const ctrl   = require('../controllers/notice.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

// 🛠️ অর্ডার পরিবর্তন করা হয়েছে: ডাইনামিক আইডি ওয়ালা রাউটের উপরে ক্যাটেগরি/ডিপার্টমেন্ট থাকবে
router.get('/categories', auth, ctrl.getCategories);
router.get('/departments', auth, ctrl.getDepartments);
router.get('/',           auth, ctrl.getAll);

router.post('/',       auth, role('faculty','admin'), ctrl.create);
router.put('/:id',     auth, role('faculty','admin'), ctrl.update);
router.delete('/:id',  auth, role('faculty','admin'), ctrl.remove);

module.exports = router;