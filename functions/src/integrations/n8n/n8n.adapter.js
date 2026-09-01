const n8nClient = require('./n8n.client');

const executeWorkflow = async (orchestrationPayload) => {
  // Normalize and strictly enforce response structure (Blueprint Sec 38/67)
  const response = await n8nClient.sendToN8n(orchestrationPayload);
  
  if (!response.type || !['message', 'function_call', 'error'].includes(response.type)) {
    throw new Error('Invalid response type returned from n8n orchestrator');
  }

  return response;
};

module.exports = { executeWorkflow };
