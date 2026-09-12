// Mock Firebase and n8n before requiring modules
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetCollection = jest.fn();

jest.mock('../../config/firebase', () => ({
  db: {
    doc: jest.fn(() => ({
      get: mockGetDoc,
      set: mockSetDoc,
      update: mockUpdateDoc,
    })),
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: mockGetCollection,
    })),
  },
  auth: {
    verifyIdToken: jest.fn(),
  },
}));

jest.mock('../../integrations/n8n/n8n.adapter', () => ({
  executeWorkflow: jest.fn(),
}));

const functionTestService = require('../../modules/functions/function.test-service');
const n8nAdapter = require('../../integrations/n8n/n8n.adapter');
const { resumeOrchestration } = require('../../ai/orchestration/orchestration.service');

describe('Function Calling Integration Flow (Blueprint Sec 22, 28, 32, 53, 55)', () => {
  const mockTenant = {
    workspaceId: 'workspace_user_1',
    projectId: 'test-project-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Standalone Function Test validates schema, generates state and SDK dispatch payload', async () => {
    // Mock function document in Firestore
    mockGetCollection.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'fn_doc_1',
          data: () => ({
            name: 'check_order_status',
            status: 'active',
            description: 'Check order status',
            parameters: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
              },
              required: ['orderId'],
            },
          }),
        },
      ],
    });

    mockSetDoc.mockResolvedValueOnce({});

    const result = await functionTestService.executeStandaloneTest(mockTenant, {
      sessionId: 'session_e2e_1',
      functionName: 'check_order_status',
      arguments: { orderId: 'ORD-9999' },
      autoMockResult: true,
    });

    expect(result.type).toBe('function_call');
    expect(result.data.function).toBe('check_order_status');
    expect(result.data.arguments).toEqual({ orderId: 'ORD-9999' });
    expect(result.data.functionCallId).toBeDefined();
    expect(result.sdkDispatchPayload).toBeDefined();
    expect(result.sdkDispatchPayload.action).toBe('EXECUTE_CAPABILITY');
    expect(result.mockSdkResult).toBeDefined();
    expect(result.mockSdkResult.orderId).toBe('ORD-9999');
  });

  test('Standalone Function Test rejects invalid arguments before persisting state', async () => {
    mockGetCollection.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'fn_doc_1',
          data: () => ({
            name: 'check_order_status',
            status: 'active',
            parameters: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
              },
              required: ['orderId'],
            },
          }),
        },
      ],
    });

    await expect(
      functionTestService.executeStandaloneTest(mockTenant, {
        sessionId: 'session_e2e_1',
        functionName: 'check_order_status',
        arguments: { orderId: 12345 }, // invalid: number instead of string
      })
    ).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_FUNCTION_ARGUMENTS' })
    );

    // Verify no state document was written to Firestore
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  test('Resume Orchestration forwards function result to n8n adapter and returns final message', async () => {
    n8nAdapter.executeWorkflow.mockResolvedValueOnce({
      type: 'message',
      data: {
        content: 'Pesanan ORD-9999 sedang dalam proses pengiriman oleh JNE.',
      },
    });

    const resumeResponse = await resumeOrchestration({
      tenant: mockTenant,
      requestId: 'req_test_abc',
      sessionId: 'session_e2e_1',
      functionResult: {
        name: 'check_order_status',
        arguments: { orderId: 'ORD-9999' },
        result: { status: 'SHIPPED', courier: 'JNE' },
      },
      aiConfig: { assistantName: 'Assistant' },
      functions: [{ name: 'check_order_status' }],
      conversationHistory: [],
    });

    expect(n8nAdapter.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req_test_abc',
        session: { id: 'session_e2e_1' },
        functionResult: expect.objectContaining({
          name: 'check_order_status',
        }),
      })
    );

    expect(resumeResponse.type).toBe('message');
    expect(resumeResponse.data.content).toContain('ORD-9999');
  });
});
