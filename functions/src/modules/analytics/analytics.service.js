const { db } = require('../../config/firebase');
const logger = require('../../config/logger');

// Blueprint Sec 47-48: Analytics Logging (Non-blocking)
const logRuntimeEvent = async (tenant, eventDetails) => {
  try {
    const analyticsRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/analytics`).doc();
    
    await analyticsRef.set({
      type: 'ai_request',
      requestId: eventDetails.requestId,
      projectId: tenant.projectId,
      sessionId: eventDetails.sessionId,
      latencyMs: eventDetails.latencyMs,
      route: eventDetails.route, // 'chat' | 'function-result' | 'rag'
      status: eventDetails.status,
      functionCalls: eventDetails.functionCalls || 0,
      retrieval: eventDetails.retrieval || null,
      provider: eventDetails.provider || 'openai',
      createdAt: Date.now()
    });
    
  } catch (error) {
    // Failing to log analytics shouldn't crash the user flow, so we catch and log it silently.
    logger.error({ err: error, requestId: eventDetails.requestId }, 'Failed to write runtime analytics to Firestore');
  }
};

module.exports = { logRuntimeEvent };
