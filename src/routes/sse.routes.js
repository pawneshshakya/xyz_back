const express = require('express');
const router = express.Router();
const { addClient } = require('../utils/sse');

router.get('/events', (req, res) => {
    addClient(req, res);
});

module.exports = router;
