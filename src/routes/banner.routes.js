const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/banner.controller");

router.get("/", bannerController.listActiveBanners);

module.exports = router;
