const logger = require('../../config/logger');

const enforcePolicy = (functionCallData, activeFunctions) => {
  const functionName = functionCallData.function;
  
  if (!functionName) {
    throw new Error('function_call response missing function name');
  }

  const registeredFn = activeFunctions.find(f => f.name === functionName);
  
  if (!registeredFn) {
    logger.warn({ functionName }, 'LLM attempted to call an unregistered function');
    const err = new Error('Function not found in registry');
    err.code = 'FUNCTION_NOT_FOUND';
    err.status = 400;
    throw err;
  }
  
  if (registeredFn.status !== 'active') {
    logger.warn({ functionName }, 'LLM attempted to call a disabled function');
    const err = new Error('Function is disabled');
    err.code = 'FUNCTION_DISABLED';
    err.status = 403;
    throw err;
  }
  
  // Clean payload to ONLY contain name and expected arguments
  // Prevent leaking metadata to client App/SDK
  return {
    function: functionName,
    arguments: functionCallData.arguments || {}
  };
};

module.exports = { enforcePolicy };
