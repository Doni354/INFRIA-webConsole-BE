const { z } = require('zod');
const runtimeStateService = require('./runtime-state.service');
const orchestrationService = require('../../ai/orchestration/orchestration.service');
const logger = require('../../config/logger');

const functionResultSchema = z.object({
  requestId: z.string().min(1),
  functionCallId: z.string().min(1),
  function: z.object({
    name: z.string().min(1),
    arguments: z.record(z.any()).optional()
  }),
  result: z.any()
});

const handleFunctionResult = async (req, res, next) => {
  try {
    const parse = functionResultSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Invalid result payload', details: parse.error.errors }
      });
    }

    const payload = parse.data;

    // Load state and safely validate expiration, idempotency, and function match (Blueprint Sec 33, 34, 35)
    const stateVal = await runtimeStateService.getAndValidateState(
      req.tenant, 
      payload.requestId, 
      payload.functionCallId, 
      payload.function.name
    );

    if (stateVal.isDuplicate) {
      logger.info({ requestId: payload.requestId }, 'Idempotent response to duplicate function-result');
      // Blueprint Sec 34: Return current known state instead of resuming orchestration
      return res.status(200).json({ status: 'acknowledged', duplicate: true });
    }

    // Persist result received state
    await runtimeStateService.markResultReceived(stateVal.stateRef, payload.result);

    // Blueprint Sec 36: Resume Orchestration
    // Normally, pass the previous chat history / trace + the newly resolved tool output back to n8n
    logger.info({ requestId: payload.requestId }, 'Resuming orchestration after function callback');
    
    // In Phase 5 mock, just respond with final mock AI response 
    const finalResponse = {
      type: 'message',
      data: {
        content: `[MOCK RESUME] Orchestrator resumed. Function ${payload.function.name} returned successfully.`
      }
    };

    const analyticsService = require('../analytics/analytics.service');
    // Fire and forget Analytics
    analyticsService.logRuntimeEvent({ uid: req.tenant.workspaceId, projectId: req.tenant.projectId }, {
      requestId: payload.requestId,
      sessionId: stateVal.state.sessionId,
      latencyMs: Date.now() - stateVal.state.createdAt,
      route: 'function-result',
      status: 'success'
    });

    res.status(200).json({
      requestId: payload.requestId,
      ...finalResponse
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleFunctionResult };
