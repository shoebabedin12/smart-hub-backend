const router = require("express").Router();
const ctrl = require("../controllers/profileRequest.controller");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

// Student: submit a request, view their own request history
router.post("/", auth, role("student"), ctrl.create);
router.get("/mine", auth, role("student"), ctrl.getMine);

// Admin: list/filter all requests, approve/reject
router.get("/", auth, role("admin"), ctrl.list);
router.put("/:id/approve", auth, role("admin"), ctrl.approve);
router.put("/:id/reject", auth, role("admin"), ctrl.reject);

module.exports = router;
