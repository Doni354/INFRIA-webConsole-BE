// Mock firebase config before requiring service
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();

const mockDoc = jest.fn((path) => ({
  set: mockSet,
  get: mockGet,
  update: mockUpdate,
}));

jest.mock('../../config/firebase', () => ({
  db: {
    doc: mockDoc,
  },
}));

const runtimeStateService = require('../../modules/runtime/runtime-state.service');

describe('Runtime State Service (Blueprint Sec 33, 34, 35, 55, 64)', () => {
  const mockTenant = {
    workspaceId: 'ws_demo_123',
    projectId: 'proj_demo_456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveFunctionCallState persists tracking doc with WAITING_CLIENT_RESULT status', async () => {
    mockSet.mockResolvedValue({});

    const functionCallId = await runtimeStateService.saveFunctionCallState(
      mockTenant,
      'session_789',
      'req_test_001',
      {
        function: 'check_order_status',
        arguments: { orderId: 'ORD-99' },
      }
    );

    expect(functionCallId).toMatch(/^fc_\d+_/);
    expect(mockDoc).toHaveBeenCalledWith(
      'users/ws_demo_123/projects/proj_demo_456/runtime_states/req_test_001'
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req_test_001',
        projectId: 'proj_demo_456',
        sessionId: 'session_789',
        status: 'WAITING_CLIENT_RESULT',
        functionName: 'check_order_status',
        functionCallId,
      })
    );
  });

  test('getAndValidateState returns isDuplicate: true if already received (idempotency)', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        status: 'FUNCTION_RESULT_RECEIVED',
        functionCallId: 'fc_123',
        functionName: 'check_order_status',
        expiresAt: Date.now() + 60000,
      }),
    });

    const result = await runtimeStateService.getAndValidateState(
      mockTenant,
      'req_001',
      'fc_123',
      'check_order_status'
    );

    expect(result.isDuplicate).toBe(true);
  });

  test('getAndValidateState throws FUNCTION_CALL_EXPIRED if expired', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        status: 'WAITING_CLIENT_RESULT',
        functionCallId: 'fc_123',
        functionName: 'check_order_status',
        expiresAt: Date.now() - 5000, // already expired 5 seconds ago
      }),
    });

    await expect(
      runtimeStateService.getAndValidateState(
        mockTenant,
        'req_001',
        'fc_123',
        'check_order_status'
      )
    ).rejects.toThrow(
      expect.objectContaining({ code: 'FUNCTION_CALL_EXPIRED' })
    );
  });

  test('getAndValidateState throws FUNCTION_RESULT_MISMATCH if function name differs', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        status: 'WAITING_CLIENT_RESULT',
        functionCallId: 'fc_123',
        functionName: 'check_order_status',
        expiresAt: Date.now() + 60000,
      }),
    });

    await expect(
      runtimeStateService.getAndValidateState(
        mockTenant,
        'req_001',
        'fc_123',
        'wrong_function_name'
      )
    ).rejects.toThrow(
      expect.objectContaining({ code: 'FUNCTION_RESULT_MISMATCH' })
    );
  });

  test('getAndValidateState returns state and stateRef when valid', async () => {
    const validState = {
      status: 'WAITING_CLIENT_RESULT',
      functionCallId: 'fc_123',
      functionName: 'check_order_status',
      expiresAt: Date.now() + 60000,
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => validState,
    });

    const result = await runtimeStateService.getAndValidateState(
      mockTenant,
      'req_001',
      'fc_123',
      'check_order_status'
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.state).toEqual(validState);
    expect(result.stateRef).toBeDefined();
  });

  test('markResultReceived updates doc status and stores result payload', async () => {
    const dummyRef = { update: mockUpdate };
    mockUpdate.mockResolvedValue({});

    await runtimeStateService.markResultReceived(dummyRef, { status: 'shipped' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FUNCTION_RESULT_RECEIVED',
        result: { status: 'shipped' },
      })
    );
  });
});
