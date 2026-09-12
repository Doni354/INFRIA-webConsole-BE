const express = require('express');
const { handleTestFunction } = require('./function.controller');
const { verifyConsoleAuth, verifyRuntimeApiKey } = require('../../middleware/project-auth');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * Flexible middleware: Accepts either Console Firebase Bearer token OR Runtime x-api-key
 */
const flexibleAuth = async (req, res, next) => {
  if (req.headers['x-api-key']) {
    return verifyRuntimeApiKey(req, res, next);
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return verifyConsoleAuth(req, res, (err) => {
      if (err) return next(err);
      req.tenant = {
        uid: req.user.uid,
        workspaceId: req.user.uid,
        projectId: req.body.projectId,
        apiKeyId: 'console_test_mode',
      };
      next();
    });
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required: provide x-api-key header or Authorization: Bearer token.',
      requestId: req.id,
    },
  });
};

/**
 * POST /v1/functions/test
 * Standalone function calling test endpoint without invoking AI/n8n
 */
router.post('/test', flexibleAuth, handleTestFunction);

module.exports = router;
