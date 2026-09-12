const { db } = require('../../config/firebase');
const logger = require('../../config/logger');

// Blueprint Sec 47-48: Analytics Logging (Non-blocking)
const logRuntimeEvent = async (tenant, eventDetails) => {
  try {
    const nowIso = new Date().toISOString();
    const eventRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/analyticsEvents`).doc();

    const payload = {
      id: eventRef.id,
      requestId: eventDetails.requestId || eventRef.id,
      projectId: tenant.projectId,
      sessionId: eventDetails.sessionId || null,
      source: eventDetails.source || 'SDK',
      route: eventDetails.route || 'DIRECT', // 'RAG' | 'FUNCTION' | 'DIRECT'
      status: eventDetails.status || 'SUCCESS', // 'SUCCESS' | 'ERROR' | 'FALLBACK'
      latencyMs: eventDetails.latencyMs || 0,
      retrievalSources: typeof eventDetails.retrievalSources === 'number' ? eventDetails.retrievalSources : 0,
      evidenceLevel: eventDetails.evidenceLevel || (eventDetails.retrievalSources > 0 ? 'HIGH' : 'NONE'),
      evidenceReason: eventDetails.evidenceReason || null,
      isKnowledgeGap: typeof eventDetails.isKnowledgeGap === 'boolean' ? eventDetails.isKnowledgeGap : false,
      topicCategory: eventDetails.topicCategory || 'General',
      functionName: eventDetails.functionName || null,
      appName: eventDetails.appName || null,
      querySnippet: eventDetails.querySnippet || null,
      timestamp: nowIso,
      createdAt: nowIso,
    };

    await eventRef.set(payload);

    logger.info({ requestId: payload.requestId, route: payload.route, evidenceLevel: payload.evidenceLevel }, 'Runtime analytics event logged');
  } catch (error) {
    // Failing to log analytics shouldn't crash the user flow, so we catch and log it silently.
    logger.error({ err: error, requestId: eventDetails?.requestId }, 'Failed to write runtime analytics to Firestore');
  }
};

module.exports = { logRuntimeEvent };
