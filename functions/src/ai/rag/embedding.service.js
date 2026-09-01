const env = require('../../config/env');
const logger = require('../../config/logger');

// Blueprint Sec 42: LLM Secret Server-Side only (BYOK)
const generateEmbedding = async (text, aiConfig) => {
  // Use project BYOK API key if specified, fallback to platform ENV
  const apiKey = aiConfig?.providerApiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logger.error('No API key configured for embedding generation');
    throw new Error('AI provider configuration missing');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small', // Blueprint standard requirement
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI responded with status: ${response.status}`);
    }

    const data = await response.json();
    // Return standard array payload
    return data.data[0].embedding;
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate embedding');
    throw new Error('AI_PROVIDER_ERROR');
  }
};

module.exports = { generateEmbedding };
