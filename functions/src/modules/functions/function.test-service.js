const { db } = require('../../config/firebase');
const { validateArguments } = require('../../ai/function-calling/function-validator');
const runtimeStateService = require('../runtime/runtime-state.service');
const logger = require('../../config/logger');

/**
 * Generate dummy SDK execution result based on function name or parameters
 */
function generateDummySdkResult(functionName, args = {}) {
  const lowerName = (functionName || '').toLowerCase();
  
  if (lowerName.includes('order') || lowerName.includes('pesan')) {
    return {
      orderId: args.orderId || 'ORD-9821-X',
      status: 'SHIPPED',
      courier: 'JNE Express',
      trackingNumber: 'JNE8829103948',
      estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      itemsCount: 2,
    };
  }
  
  if (lowerName.includes('weather') || lowerName.includes('cuaca')) {
    return {
      location: args.city || args.location || 'Jakarta',
      temperatureCelsius: 29,
      condition: 'Partly Cloudy',
      humidity: '72%',
    };
  }

  if (lowerName.includes('user') || lowerName.includes('profile') || lowerName.includes('member')) {
    return {
      userId: args.userId || 'usr_7721',
      name: 'Budi Pratama',
      tier: 'Gold Member',
      loyaltyPoints: 1250,
      verified: true,
    };
  }

  if (lowerName.includes('product') || lowerName.includes('item') || lowerName.includes('stok') || lowerName.includes('stock')) {
    return {
      productId: args.productId || 'PRD-001',
      inStock: true,
      availableQuantity: 42,
      price: 150000,
      currency: 'IDR',
    };
  }

  // Generic fallback return value
  return {
    success: true,
    invokedFunction: functionName,
    executedAt: new Date().toISOString(),
    output: `Successfully executed ${functionName} locally on client device.`,
    echoArgs: args,
  };
}

/**
 * Standalone Function Test Service — Blueprint Sec 53, 55, 64
 *
 * Tests function calling flow WITHOUT invoking n8n/AI.
 * Validates function existence, status, arguments against JSON schema,
 * creates the runtime_states tracking document in Firestore, and formats
 * the exact payload that the Flutter SDK expects to receive.
 */
const executeStandaloneTest = async (tenant, { sessionId, functionName, arguments: args = {}, autoMockResult = true }) => {
  const { workspaceId, projectId } = tenant;
  const sessId = sessionId || `test_sess_${Date.now()}`;

  logger.info({ workspaceId, projectId, functionName }, 'Executing standalone function test');

  // 1. Fetch function definition from Firestore
  const fnSnap = await db.collection(`users/${workspaceId}/projects/${projectId}/functions`)
    .where('name', '==', functionName)
    .limit(1)
    .get();

  if (fnSnap.empty) {
    const err = new Error(`Function '${functionName}' not found in project function registry.`);
    err.code = 'FUNCTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const doc = fnSnap.docs[0];
  const registeredFn = { id: doc.id, ...doc.data() };

  // 2. Policy check: must be active
  if (registeredFn.status !== 'active') {
    const err = new Error(`Function '${functionName}' is currently disabled (${registeredFn.status}).`);
    err.code = 'FUNCTION_DISABLED';
    err.status = 400;
    throw err;
  }

  // 3. Schema check: validate arguments against JSON Schema
  validateArguments(args, registeredFn);

  // 4. Generate canonical requestId & persist runtime state
  const requestId = `req_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  const functionCallId = await runtimeStateService.saveFunctionCallState(
    tenant,
    sessId,
    requestId,
    {
      function: functionName,
      arguments: args,
    }
  );

  // 5. Generate dummy SDK result for immediate testing if requested
  const mockResult = autoMockResult ? generateDummySdkResult(functionName, args) : null;

  return {
    requestId,
    sessionId: sessId,
    type: 'function_call',
    data: {
      functionCallId,
      function: functionName,
      arguments: args,
    },
    // Blueprint SDK Capability Dispatch shape
    sdkDispatchPayload: {
      action: 'EXECUTE_CAPABILITY',
      capabilityName: functionName,
      parameters: args,
      correlation: {
        requestId,
        functionCallId,
      }
    },
    mockSdkResult: mockResult,
    registeredFunctionMeta: {
      id: registeredFn.id,
      name: registeredFn.name,
      description: registeredFn.description,
      status: registeredFn.status,
    }
  };
};

module.exports = {
  executeStandaloneTest,
  generateDummySdkResult,
};
