const express = require('express');
const { handlePublish } = require('./knowledge.controller');
const { verifyConsoleAuth } = require('../../middleware/auth');

const router = express.Router();

// Blueprint Sec 43: Knowledge processing operations use Firebase Auth ID Token 
router.post('/publish', verifyConsoleAuth, handlePublish);
router.post('/reindex', verifyConsoleAuth, handlePublish); // Reindex uses same flow for MVP

module.exports = router;
