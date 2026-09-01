const n8nAdapter = require('../../integrations/n8n/n8n.adapter');
const logger = require('../../config/logger');

const orchestrateChat = async ({ tenant, sessionId, message, aiConfig, functions, context }) => {
  
  // Blueprint Sec 22: Normalized Orchestration Payload
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
      assistantName: aiConfig?.assistantName || "INFRIA Assistant",
      role: aiConfig?.role || "Assistant",
      language: aiConfig?.language || "id",
      tone: aiConfig?.tone || "neutral",
      // Pass the LLM choice config to n8n if needed
      model: aiConfig?.providerModel || 'gpt-4o-mini'
    },
    knowledge: {
      enabled: aiConfig?.knowledgeEnabled ?? true,
      context: context || []
    },
    functions: functions || [],
    message: message
  };

  logger.info({ projectId: payload.project.id }, 'Dispatching payload to Orchestration (n8n)');
  return await n8nAdapter.executeWorkflow(payload);
};

module.exports = { orchestrateChat };
