const orchestrationService = require('../../ai/orchestration/orchestration.service');
const retrievalService = require('../../ai/rag/retrieval.service');
const logger = require('../../config/logger');

const processChat = async (tenant, sessionId, message) => {
  logger.info({ tenant, sessionId }, 'Processing runtime chat request');
  
  // Minimal empty arrays pending Phase 7 configuration setup. 
  // Normally config will be loaded via ConfigRepository.
  const aiConfig = { knowledgeEnabled: true }; 
  const functions = [];
  
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
