const { z } = require('zod');
const runtimeStateService = require('./runtime-state.service');
const { resumeOrchestration } = require('../../ai/orchestration/orchestration.service');
const logger = require('../../config/logger');
const { db } = require('../../config/firebase');

const functionResultSchema = z.object({
  requestId: z.string().min(1),
  functionCallId: z.string().min(1),
  function: z.object({
    name: z.string().min(1),
    arguments: z.record(z.any()).optional()
  }),
  result: z.any(),
  projectId: z.string().optional(),
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

    // Blueprint Sec 33, 34, 35: Load state, check idempotency, expiry, and function match
    const stateVal = await runtimeStateService.getAndValidateState(
      req.tenant,
      payload.requestId,
      payload.functionCallId,
      payload.function.name
    );

    if (stateVal.isDuplicate) {
      logger.info({ requestId: payload.requestId }, 'Idempotent response to duplicate function-result');
      return res.status(200).json({ status: 'acknowledged', duplicate: true });
    }

    // Blueprint Sec 56: Atomic state transition
    await runtimeStateService.markResultReceived(stateVal.stateRef, payload.result);

    // ── Load context needed for resume ──────────────────────────────────────
    // Load AI config and active functions to reconstruct the LLM prompt context
    const { workspaceId, projectId } = req.tenant;
    const { sessionId } = stateVal.state;

    let aiConfig = { knowledgeEnabled: true };
    try {
      const aiSnap = await db.doc(`users/${workspaceId}/projects/${projectId}/ai_config/config`).get();
      if (aiSnap.exists) aiConfig = aiSnap.data();
    } catch (e) {
      logger.warn({ err: e }, 'Failed to load AI Config for resume orchestration, using default');
    }

    let activeFunctions = [];
    try {
      const fnSnap = await db.collection(`users/${workspaceId}/projects/${projectId}/functions`)
        .where('status', '==', 'active')
        .get();
      fnSnap.forEach(doc => activeFunctions.push({ id: doc.id, ...doc.data() }));
    } catch (e) {
      logger.warn({ err: e }, 'Failed to load functions for resume orchestration');
    }

    // Load last N messages from Firestore chat session for conversation context
    // n8n uses this to rebuild the LLM message array properly
    let conversationHistory = [];
    try {
      const msgsSnap = await db.collection(`users/${workspaceId}/projects/${projectId}/chatSessions/${sessionId}/messages`)
        .orderBy('timestamp', 'desc')
        .limit(10) // Blueprint: max 10 messages (5 pairs)
        .get();

      const msgs = [];
      msgsSnap.forEach(doc => msgs.push(doc.data()));
      conversationHistory = msgs.reverse(); // Re-order chronologically
    } catch (e) {
      logger.warn({ err: e }, 'Failed to load conversation history for resume — continuing without history');
    }

    // ── Blueprint Sec 36: Resume Orchestration ─────────────────────────────
    logger.info({ requestId: payload.requestId }, 'Resuming orchestration after function callback');

    const finalResponse = await resumeOrchestration({
      tenant: req.tenant,
      requestId: payload.requestId,
      sessionId,
      functionResult: {
        name: payload.function.name,
        arguments: payload.function.arguments || {},
        result: payload.result,
      },
      aiConfig,
      functions: activeFunctions,
      conversationHistory,
    });

    // Analytics: log the function-result leg
    const analyticsService = require('../analytics/analytics.service');
    analyticsService.logRuntimeEvent(
      { uid: workspaceId, projectId },
      {
        requestId: payload.requestId,
        sessionId,
        latencyMs: Date.now() - stateVal.state.createdAt,
        route: finalResponse.type === 'function_call' ? 'function' : 'chat',
        status: 'success',
        functionName: payload.function.name,
      }
    );

    res.status(200).json({
      requestId: payload.requestId,
      ...finalResponse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleFunctionResult };
