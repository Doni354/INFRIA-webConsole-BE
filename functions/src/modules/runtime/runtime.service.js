const orchestrationService = require('../../ai/orchestration/orchestration.service');
const retrievalService = require('../../ai/rag/retrieval.service');
const { selectRelevantFunctions } = require('../../ai/function-calling/function-selector');
const { enforcePolicy } = require('../../ai/function-calling/function-policy.service');
const { validateArguments } = require('../../ai/function-calling/function-validator');
const runtimeStateService = require('./runtime-state.service');
const logger = require('../../config/logger');
const { db } = require('../../config/firebase');

const processChat = async (tenant, sessionId, message) => {
  logger.info({ tenant, sessionId }, 'Processing runtime chat request');
  
  // ── Phase 1: Load AI Config ────────────────────────────────────────────────
  let aiConfig = { knowledgeEnabled: true };
  try {
    const aiSnap = await db.doc(`users/${tenant.workspaceId}/projects/${tenant.projectId}/ai_config/config`).get();
    if (aiSnap.exists) {
      aiConfig = aiSnap.data();
    }
  } catch (e) {
    logger.warn({ err: e }, 'Failed to fetch AI Config, using default.');
  }

  // ── Phase 2: Load Active Functions + Smart Selector ───────────────────────
  let allActiveFunctions = [];
  try {
    const fnSnap = await db.collection(`users/${tenant.workspaceId}/projects/${tenant.projectId}/functions`)
      .where('status', '==', 'active')
      .get();
    fnSnap.forEach(doc => allActiveFunctions.push({ id: doc.id, ...doc.data() }));
  } catch (e) {
    logger.warn({ err: e }, 'Failed to fetch active functions.');
  }

  // Blueprint Sec 21 Step 8: Smart filter — only inject relevant functions
  const functions = selectRelevantFunctions(allActiveFunctions, message);

  // ── Phase 3: RAG Context Retrieval ────────────────────────────────────────
  const ragResult = await retrievalService.retrieveContext(tenant, aiConfig, message);

  if (ragResult.fallback) {
    logger.info('RAG found no local context, continuing to Orchestrator without KB data');
  }

  // ── Phase 3.5: Load Conversation History (Multi-turn memory) ──────────────
  let conversationHistory = [];
  try {
    const msgsSnap = await db.collection(`users/${tenant.workspaceId}/projects/${tenant.projectId}/chatSessions/${sessionId}/messages`)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    const msgs = [];
    msgsSnap.forEach(doc => {
      const d = doc.data();
      if (d.role && d.content) {
        msgs.push({ role: d.role, content: d.content });
      }
    });
    conversationHistory = msgs.reverse();
  } catch (histErr) {
    logger.warn({ err: histErr }, 'Failed to load conversation history for chat — continuing without history');
  }

  // ── Phase 4: Orchestrate ───────────────────────────────────────────────────
  const response = await orchestrationService.orchestrateChat({
    tenant,
    sessionId,
    message,
    aiConfig,
    functions,
    context: ragResult.context,
    conversationHistory
  });

  // ── Phase 4.5: Grounding Evaluation Metadata Extraction ─────────────────────
  const rawMeta = response.data?.metadata || {};
  const hasRagChunks = ragResult.context && ragResult.context.length > 0;

  const evaluation = {
    evidenceLevel: rawMeta.evidenceLevel || (hasRagChunks ? 'HIGH' : 'NONE'),
    evidenceReason: rawMeta.evidenceReason || (hasRagChunks ? `Grounded with ${ragResult.context.length} knowledge chunk(s).` : 'Answered directly without specific knowledge base documents.'),
    isKnowledgeGap: typeof rawMeta.isKnowledgeGap === 'boolean' ? rawMeta.isKnowledgeGap : !hasRagChunks,
    topicCategory: rawMeta.topicCategory || 'General Inquiry',
  };

  const sessionTitle = response.data?.sessionTitle || response.sessionTitle || null;

  response.evaluation = evaluation;
  if (sessionTitle) {
    response.sessionTitle = sessionTitle;
  }

  // ── Phase 5: Handle function_call response ────────────────────────────────
  // Blueprint Sec 28-30: If LLM requests a function, validate via policy
  // and persist runtime state before forwarding to SDK.
  if (response.type === 'function_call' && response.data) {
    const functionCallData = response.data;

    // Blueprint Sec 28: Policy check — function must exist in our loaded list
    // (use allActiveFunctions so policy sees full registry even after selector filtering)
    const cleanedCall = enforcePolicy(functionCallData, allActiveFunctions);

    // Blueprint Sec 53: Validate argument types against the function's JSON Schema
    const registeredFn = allActiveFunctions.find(f => f.name === cleanedCall.function);
    validateArguments(cleanedCall.arguments, registeredFn);

    // Blueprint Sec 55: Persist runtime state so function-result can be validated
    const functionCallId = await runtimeStateService.saveFunctionCallState(
      tenant,
      sessionId,
      response.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cleanedCall
    );

    // Attach functionCallId to the response so controller can correlate
    response.data = {
      ...cleanedCall,
      functionCallId,
    };
  }

  // ── Simulator Trace Metadata ───────────────────────────────────────────────
  if (tenant.apiKeyId === 'simulator_mode') {
    response.__trace = {
      functionsLoaded: allActiveFunctions.length,
      functionsInjected: functions.length,
      ragChunksInjected: ragResult.context.length,
      ragThreshold: typeof aiConfig.retrievalThreshold === 'number' ? aiConfig.retrievalThreshold : 0.70,
      ragTopK: typeof aiConfig.retrievalTopK === 'number' ? aiConfig.retrievalTopK : 5,
      ragFallback: ragResult.fallback,
      chunksPreview: ragResult.context.map(c => c.substring(0, 75) + '...'),
      evidenceLevel: evaluation.evidenceLevel,
      evidenceReason: evaluation.evidenceReason,
      isKnowledgeGap: evaluation.isKnowledgeGap,
      topicCategory: evaluation.topicCategory,
      sessionTitle,
    };
  }

  return response;
};

module.exports = { processChat };
