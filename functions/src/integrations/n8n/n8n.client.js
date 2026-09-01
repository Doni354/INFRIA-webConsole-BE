const env = require('../../config/env');
const logger = require('../../config/logger');

// Blueprint Sec 38, 41: n8n client with Secret
const sendToN8n = async (payload) => {
  const webhookUrl = process.env.N8N_RUNTIME_WEBHOOK;
  const sharedSecret = process.env.N8N_SHARED_SECRET;

  if (!webhookUrl) {
    logger.warn('N8N_RUNTIME_WEBHOOK is not configured. Returning mock orchestration response.');
    return {
      type: 'message',
      data: {
        content: `[MOCK ORCHESTRATOR] I received your message: "${payload.message}". Add webhook URL to .env to call the real LLM.`
      }
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sharedSecret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error({ err: error }, 'Failed to communicate with n8n orchestration layer');
    throw new Error('Orchestration communication failed');
  }
};

module.exports = { sendToN8n };
