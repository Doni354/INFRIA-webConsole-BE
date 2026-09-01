const { chatRequestSchema } = require('./runtime.schema');
const runtimeService = require('./runtime.service');
const logger = require('../../config/logger');

const handleChat = async (req, res, next) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      // Blueprint Sec 44: Error Model consistent envelope
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'The request body is invalid.',
          details: parseResult.error.errors,
          requestId: req.id,
        }
      });
    }

    const { sessionId, message, projectId } = parseResult.data;

    // Blueprint Sec 13: Project ID Validation against Tenant Context
    if (projectId !== req.tenant.projectId) {
      logger.warn({ reqId: req.id, claimed: projectId, actual: req.tenant.projectId }, 'Security Warning: Project ID claim mismatch');
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'The provided project configuration is unauthorized.', requestId: req.id }
      });
    }

    const startTime = Date.now();
    const response = await runtimeService.processChat(req.tenant, sessionId, message);
    const latencyMs = Date.now() - startTime;

    const analyticsService = require('../analytics/analytics.service');
    // Fire and forget (tenant is mapped: workspaceId = uid for MVP analytics)
    analyticsService.logRuntimeEvent({ uid: req.tenant.workspaceId, projectId: req.tenant.projectId }, {
      requestId: req.id,
      sessionId,
      latencyMs,
      route: 'chat',
      status: 'success'
    });

    // Combine standard response with request ID
    res.status(200).json({
      requestId: req.id,
      ...response
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleChat };
