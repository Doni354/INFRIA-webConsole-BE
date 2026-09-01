const { db } = require('../../config/firebase');
const env = require('../../config/env');
const logger = require('../../config/logger');

// Blueprint Sec 55: Runtime State Storage
const saveFunctionCallState = async (tenant, sessionId, requestId, functionCallPayload) => {
  const stateRef = db.doc(`users/${tenant.workspaceId}/projects/${tenant.projectId}/runtime_states/${requestId}`);
  
  const functionCallId = `fc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const expiresAt = Date.now() + (env.RUNTIME_FUNCTION_TIMEOUT_SECONDS * 1000);

  await stateRef.set({
    requestId,
    projectId: tenant.projectId,
    sessionId,
    status: 'WAITING_CLIENT_RESULT',
    functionCallId,
    functionName: functionCallPayload.function,
    createdAt: Date.now(),
    expiresAt,
  });

  logger.info({ requestId, functionCallId }, 'Function call tracking state saved');
  
  return functionCallId;
};

const getAndValidateState = async (tenant, requestId, functionCallId, functionName) => {
  const stateRef = db.doc(`users/${tenant.workspaceId}/projects/${tenant.projectId}/runtime_states/${requestId}`);
  const snap = await stateRef.get();

  if (!snap.exists) {
    const err = new Error('Function request state not found');
    err.code = 'INVALID_REQUEST';
    err.status = 400;
    throw err;
  }

  const state = snap.data();

  // Blueprint Sec 34: Idempotency
  if (state.status === 'FUNCTION_RESULT_RECEIVED' || state.status === 'COMPLETED') {
    return { isDuplicate: true }; 
  }

  // Blueprint Sec 35: Expiration
  if (Date.now() > state.expiresAt) {
    const err = new Error('Function call waiting period has expired');
    err.code = 'FUNCTION_CALL_EXPIRED';
    err.status = 400;
    throw err;
  }

  // Blueprint Sec 33: Function Result Validation check against state metadata
  if (state.functionCallId !== functionCallId || state.functionName !== functionName) {
    const err = new Error('Function metadata mismatch. Check requestId and function settings.');
    err.code = 'FUNCTION_RESULT_MISMATCH';
    err.status = 400;
    throw err;
  }

  return { isDuplicate: false, state, stateRef };
};

const markResultReceived = async (stateRef, result) => {
  await stateRef.update({
    status: 'FUNCTION_RESULT_RECEIVED',
    resultReceivedAt: Date.now(),
    result
  });
};

module.exports = { saveFunctionCallState, getAndValidateState, markResultReceived };
