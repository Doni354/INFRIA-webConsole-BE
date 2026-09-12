const express = require('express');
const { handleChat } = require('./runtime.controller');
const { handleFunctionResult } = require('./function-result.controller');
const { verifyRuntimeApiKey } = require('../../middleware/project-auth');

const router = express.Router();

// Blueprint Sec 19: POST /v1/runtime/chat
router.post('/chat', verifyRuntimeApiKey, handleChat);

// Blueprint Sec 32: POST /v1/runtime/function-result
router.post('/function-result', verifyRuntimeApiKey, handleFunctionResult);

const { verifyConsoleAuth } = require('../../middleware/auth');
router.post('/console-simulator', verifyConsoleAuth, (req, res, next) => {
  // Inject mock tenant context specifically for isolated playground testing
  req.tenant = {
    uid: req.user.uid,
    workspaceId: req.user.uid,
    projectId: req.body.projectId, // Sent from Simulator React
    apiKeyId: 'simulator_mode'
  };
  // Pipeline directly into handleChat logic (Same logic as user SDK requests)
  handleChat(req, res, next);
});

router.post('/console-function-result', verifyConsoleAuth, (req, res, next) => {
  // Inject mock tenant context for console simulator function callback testing
  req.tenant = {
    uid: req.user.uid,
    workspaceId: req.user.uid,
    projectId: req.body.projectId,
    apiKeyId: 'simulator_mode'
  };
  handleFunctionResult(req, res, next);
});

module.exports = router;
