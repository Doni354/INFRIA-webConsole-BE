const orchestrationService = require('../../ai/orchestration/orchestration.service');
const retrievalService = require('../../ai/rag/retrieval.service');
const logger = require('../../config/logger');
const { db } = require('../../config/firebase');

const processChat = async (tenant, sessionId, message) => {
  logger.info({ tenant, sessionId }, 'Processing runtime chat request');
  
  // Phase 9 Final: Fetch real configurations from DB
  let aiConfig = { knowledgeEnabled: true }; 
  try {
    const aiSnap = await db.doc(`users/${tenant.workspaceId}/projects/${tenant.projectId}/ai_config/config`).get();
    if (aiSnap.exists) {
      aiConfig = aiSnap.data();
    }
  } catch (e) {
    logger.warn({ err: e }, 'Failed to fetch AI Config, using default.');
  }

  const functions = [];
  try {
    const fnSnap = await db.collection(`users/${tenant.workspaceId}/projects/${tenant.projectId}/functions`)
      .where('status', '==', 'active')
      .get();
    fnSnap.forEach(doc => functions.push({ id: doc.id, ...doc.data() }));
  } catch (e) {
    logger.warn({ err: e }, 'Failed to fetch active functions.');
  }
  
  // Phase 6: RAG Context Retrieval (will only run if knowledgeEnabled = true)
  const ragResult = await retrievalService.retrieveContext(tenant, aiConfig, message);
  
  if (ragResult.fallback) {
    // If no context found and fallback triggered, respond immediately or orchestrate with fallback system prompt.
    // We send payload to orchestrator anyway, but explicitly without knowledge context.
    logger.info('RAG failed or found no local context, continuing to Orchestrator without KB data');
  }

  const response = await orchestrationService.orchestrateChat({
    tenant,
    sessionId,
    message,
    aiConfig,
    functions,
    context: ragResult.context
  });

  return response;
};

module.exports = { processChat };
