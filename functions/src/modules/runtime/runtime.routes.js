const express = require('express');
const { handleChat } = require('./runtime.controller');
const { handleFunctionResult } = require('./function-result.controller');
const { verifyRuntimeApiKey } = require('../../middleware/project-auth');

const router = express.Router();

// Blueprint Sec 19: POST /v1/runtime/chat
router.post('/chat', verifyRuntimeApiKey, handleChat);

// Blueprint Sec 32: POST /v1/runtime/function-result
router.post('/function-result', verifyRuntimeApiKey, handleFunctionResult);

module.exports = router;
