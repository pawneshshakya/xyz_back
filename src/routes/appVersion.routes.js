const express = require('express');
const router = express.Router();
const appVersionController = require('../controllers/appVersion.controller');

router.get('/version', appVersionController.getVersionStatus);

module.exports = router;
