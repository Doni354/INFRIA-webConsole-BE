const { chatRequestSchema } = require('./runtime.schema');
const runtimeService = require('./runtime.service');
const runtimeStateService = require('./runtime-state.service');
const logger = require('../../config/logger');

const handleChat = async (req, res, next) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
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

    // Blueprint Sec 55: If a function_call was generated, we need to update the
    // persisted runtime state with the real requestId (req.id) from the controller.
    // The service saves state with a temp requestId; we re-save with the canonical one.
    if (response.type === 'function_call' && response.data?.functionCallId) {
      try {
        // Update Firestore state to use req.id as the canonical requestId
        const stateRef = require('../../config/firebase').db.doc(
          `users/${req.tenant.workspaceId}/projects/${req.tenant.projectId}/runtime_states/${req.id}`
        );
        await stateRef.set({
          requestId: req.id,
          projectId: req.tenant.projectId,
          sessionId,
          status: 'WAITING_CLIENT_RESULT',
          functionCallId: response.data.functionCallId,
          functionName: response.data.function,
          createdAt: Date.now(),
          expiresAt: Date.now() + (require('../../config/env').RUNTIME_FUNCTION_TIMEOUT_SECONDS * 1000),
        }, { merge: true });

        logger.info(
          { requestId: req.id, functionCallId: response.data.functionCallId, functionName: response.data.function },
          'Function call state persisted with canonical requestId'
        );
      } catch (stateErr) {
        logger.error({ err: stateErr }, 'Failed to persist canonical function call state');
        // Non-fatal: we still return the function_call response
      }
    }

    // Persist session metadata and messages (Blueprint & Analytics Spec)
    try {
      const { db } = require('../../config/firebase');
      const sessionRef = db.doc(
        `users/${req.tenant.workspaceId}/projects/${req.tenant.projectId}/chatSessions/${sessionId}`
      );
      const sessionSnap = await sessionRef.get();
      const nowIso = new Date().toISOString();
      const smartTitle = response.sessionTitle || response.data?.sessionTitle;

      if (!sessionSnap.exists) {
        const title = smartTitle || (message.length > 60 ? message.slice(0, 60) + '…' : message);
        await sessionRef.set({
          id: sessionId,
          projectId: req.tenant.projectId,
          title,
          source: req.tenant.apiKeyId === 'simulator_mode' ? 'SIMULATOR' : 'SDK',
          messageCount: req.tenant.apiKeyId === 'simulator_mode' ? 0 : 2,
          createdAt: nowIso,
          updatedAt: nowIso,
        }, { merge: true });
      } else if (smartTitle) {
        await sessionRef.set({
          title: smartTitle,
          updatedAt: nowIso,
        }, { merge: true });
      }

      // For external SDK requests, persist user and assistant messages
      if (req.tenant.apiKeyId !== 'simulator_mode') {
        const msgCol = sessionRef.collection('messages');
        await msgCol.add({
          role: 'user',
          content: message,
          timestamp: new Date(startTime).toISOString(),
        });
        await msgCol.add({
          role: 'assistant',
          content: response.data?.content || (response.type === 'function_call' ? `Function call: ${response.data?.function}` : ''),
          timestamp: nowIso,
          metadata: {
            route: response.type === 'function_call' ? 'FUNCTION' : (response.__trace?.ragChunksInjected > 0 ? 'RAG' : 'DIRECT'),
            requestId: req.id,
            latencyMs,
            evidenceLevel: response.evaluation?.evidenceLevel || null,
          }
        });
        await sessionRef.set({
          messageCount: (sessionSnap.exists ? sessionSnap.data().messageCount || 0 : 0) + 2,
          updatedAt: nowIso,
        }, { merge: true });
      }
    } catch (sessionErr) {
      logger.warn({ err: sessionErr }, 'Failed to persist session/messages to Firestore');
    }

    const analyticsService = require('../analytics/analytics.service');
    analyticsService.logRuntimeEvent(
      { uid: req.tenant.workspaceId, projectId: req.tenant.projectId },
      {
        requestId: req.id,
        sessionId,
        latencyMs,
        source: req.tenant.apiKeyId === 'simulator_mode' ? 'SIMULATOR' : 'SDK',
        route: response.type === 'function_call' ? 'FUNCTION' : (response.__trace?.ragChunksInjected > 0 ? 'RAG' : 'DIRECT'),
        status: 'SUCCESS',
        functionName: response.type === 'function_call' ? response.data?.function : null,
        retrievalSources: response.__trace?.ragChunksInjected ?? 0,
        evidenceLevel: response.evaluation?.evidenceLevel || 'HIGH',
        evidenceReason: response.evaluation?.evidenceReason || null,
        isKnowledgeGap: response.evaluation?.isKnowledgeGap || false,
        topicCategory: response.evaluation?.topicCategory || 'General',
        appName: req.headers['x-infria-app-name'] || (req.tenant.apiKeyId === 'simulator_mode' ? null : 'SDK Client'),
        querySnippet: message.substring(0, 150),
      }
    );

    res.status(200).json({
      requestId: req.id,
      ...response,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleChat };
