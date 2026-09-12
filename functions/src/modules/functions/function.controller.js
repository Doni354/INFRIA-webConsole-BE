const { z } = require('zod');
const functionTestService = require('./function.test-service');
const logger = require('../../config/logger');

const testFunctionSchema = z.object({
  projectId: z.string().min(1),
  functionName: z.string().min(1),
  arguments: z.record(z.any()).optional().default({}),
  sessionId: z.string().optional(),
  autoMockResult: z.boolean().optional().default(true),
});

const handleTestFunction = async (req, res, next) => {
  try {
    const parse = testFunctionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid test function payload.',
          details: parse.error.errors,
          requestId: req.id,
        },
      });
    }

    const { projectId, functionName, arguments: args, sessionId, autoMockResult } = parse.data;

    // Security check: tenant.projectId must match claimed projectId
    if (req.tenant.projectId && req.tenant.projectId !== projectId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Tenant context mismatch with requested projectId.',
          requestId: req.id,
        },
      });
    }

    const tenant = {
      workspaceId: req.tenant.workspaceId || req.tenant.uid,
      projectId,
      apiKeyId: req.tenant.apiKeyId || 'function_test_mode',
    };

    const result = await functionTestService.executeStandaloneTest(tenant, {
      sessionId,
      functionName,
      arguments: args,
      autoMockResult,
    });

    res.status(200).json({
      success: true,
      requestId: req.id || result.requestId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleTestFunction,
};
