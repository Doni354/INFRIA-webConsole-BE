const n8nAdapter = require('../../integrations/n8n/n8n.adapter');
const logger = require('../../config/logger');

/**
 * Initial chat orchestration — Blueprint Sec 22: Normalized Orchestration Payload
 */
const orchestrateChat = async ({ tenant, sessionId, message, aiConfig, functions, context, conversationHistory }) => {
  const payload = {
    project: {
      id: tenant.projectId
    },
    session: {
      id: sessionId
    },
    user: {
      id: tenant.workspaceId
    },
    ai: {
      assistantName: aiConfig?.assistantName || 'INFRIA Assistant',
      role: aiConfig?.role || 'Assistant',
      language: aiConfig?.language || 'en',
      tone: aiConfig?.tone || 'neutral',
      model: aiConfig?.providerModel || 'gpt-4o-mini'
    },
    knowledge: {
      enabled: aiConfig?.knowledgeEnabled ?? true,
      context: context || []
    },
    functions: functions || [],
    message: message,
    conversationHistory: conversationHistory || []
  };

  logger.info({ projectId: payload.project.id, functionCount: payload.functions.length }, 'Dispatching payload to Orchestration (n8n)');
  return await n8nAdapter.executeWorkflow(payload);
};

/**
 * Resume orchestration after a client function callback — Blueprint Sec 36
 *
 * Called by function-result.controller after receiving a valid function result
 * from the Flutter SDK. Sends the function result back to n8n so the LLM can
 * produce a final response (or request another function).
 *
 * @param {object} params
 * @param {object} params.tenant - TenantContext
 * @param {string} params.requestId - Original request ID for correlation
 * @param {string} params.sessionId
 * @param {object} params.functionResult - { name, arguments, result }
 * @param {object} params.aiConfig
 * @param {Array}  params.functions - Active functions (same as original request)
 * @param {Array}  params.conversationHistory - Previous messages for LLM context
 */
const resumeOrchestration = async ({ tenant, requestId, sessionId, functionResult, aiConfig, functions, conversationHistory }) => {
  const payload = {
    resume: true,  // Signal to n8n workflow that this is a resume, not a fresh request
    requestId,
    project: {
      id: tenant.projectId
    },
    session: {
      id: sessionId
    },
    user: {
      id: tenant.workspaceId
    },
    ai: {
      assistantName: aiConfig?.assistantName || 'INFRIA Assistant',
      role: aiConfig?.role || 'Assistant',
      language: aiConfig?.language || 'en',
      tone: aiConfig?.tone || 'neutral',
      model: aiConfig?.providerModel || 'gpt-4o-mini'
    },
    functions: functions || [],
    functionResult: {
      name: functionResult.name,
      arguments: functionResult.arguments || {},
      result: functionResult.result,
    },
    conversationHistory: conversationHistory || [],
  };

  logger.info(
    { requestId, projectId: tenant.projectId, functionName: functionResult.name },
    'Resuming orchestration with function result'
  );

  return await n8nAdapter.executeWorkflow(payload);
};

module.exports = { orchestrateChat, resumeOrchestration };
