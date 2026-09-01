const express = require('express');
const { handleGenerate, handleRevoke } = require('./api-key.controller');
const { verifyConsoleAuth } = require('../../middleware/auth');

const router = express.Router();

router.post('/generate', verifyConsoleAuth, handleGenerate);
router.post('/revoke', verifyConsoleAuth, handleRevoke);

module.exports = router;
