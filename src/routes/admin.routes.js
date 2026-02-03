const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const appVersionController = require('../controllers/appVersion.controller');

const { protect } = require("../middlewares/auth.middleware");
const { isAdmin } = require("../middlewares/admin.middleware");

router.use(protect); // All admin routes require authentication
router.use(isAdmin); // All admin routes require admin privileges

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getUsers);
router.get("/matches", adminController.getMatches);
router.post("/create-sponsored-event", adminController.createSponsoredEvent);
router.post("/create-premium-event", adminController.createPremiumEvent);
router.post('/app/version', appVersionController.upsertVersionConfig);
router.put("/matches/:id", adminController.updateMatch);
router.delete("/matches/:id", adminController.deleteMatch);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
