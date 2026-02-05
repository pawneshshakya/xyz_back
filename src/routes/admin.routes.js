const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const appVersionController = require('../controllers/appVersion.controller');

const { protect } = require("../middlewares/auth.middleware");
const { isAdmin } = require("../middlewares/admin.middleware");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "banners");
fs.mkdirSync(uploadsRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeExt = ext.toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads allowed"));
      return;
    }
    cb(null, true);
  },
});

router.use(protect); // All admin routes require authentication
router.use(isAdmin); // All admin routes require admin privileges

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.get("/matches", adminController.getMatches);
router.get("/matches/:id", adminController.getMatchById);
router.get("/transactions", adminController.getTransactions);
router.get("/transactions/:id", adminController.getTransactionById);
router.get("/wallets", adminController.getWallets);
router.get("/wallets/:id", adminController.getWalletById);
router.post("/wallets/:id/adjust", adminController.adjustWalletBalance);
router.get("/weekly-performance", adminController.getWeeklyPerformance);
router.get("/banners", adminController.getBanners);
router.post("/banners", adminController.createBanner);
router.post("/banners/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "image is required" });
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const publicPath = `/uploads/banners/${req.file.filename}`;
  return res.json({ success: true, data: { url: `${baseUrl}${publicPath}` } });
});
router.put("/banners/:id", adminController.updateBanner);
router.delete("/banners/:id", adminController.deleteBanner);
router.post("/create-sponsored-event", adminController.createSponsoredEvent);
router.post("/create-standard-event", adminController.createStandardEvent);
router.post("/create-premium-event", adminController.createPremiumEvent);
router.post('/app/version', appVersionController.upsertVersionConfig);
router.get('/app/version', appVersionController.getVersionConfig);
router.put("/matches/:id", adminController.updateMatch);
router.delete("/matches/:id", adminController.deleteMatch);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
