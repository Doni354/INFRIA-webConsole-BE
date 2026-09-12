const { enforcePolicy } = require('../../ai/function-calling/function-policy.service');

describe('Function Policy Service (Blueprint Sec 28, 64)', () => {
  const mockActiveFunctions = [
    {
      id: 'fn_1',
      name: 'check_order_status',
      status: 'active',
      description: 'Check order delivery status',
    },
    {
      id: 'fn_2',
      name: 'cancel_order',
      status: 'inactive',
      description: 'Cancel an order',
    },
  ];

  test('passes policy check for registered active function', () => {
    const payload = {
      function: 'check_order_status',
      arguments: { orderId: 'ORD-123' },
      internalLeakedMeta: 'secret',
    };

    const result = enforcePolicy(payload, mockActiveFunctions);

    expect(result).toEqual({
      function: 'check_order_status',
      arguments: { orderId: 'ORD-123' },
    });
    // Verifies leaked metadata is stripped
    expect(result.internalLeakedMeta).toBeUndefined();
  });

  test('throws FUNCTION_NOT_FOUND if function is not registered in project', () => {
    const payload = {
      function: 'unknown_capability',
      arguments: {},
    };

    expect(() => enforcePolicy(payload, mockActiveFunctions)).toThrow(
      expect.objectContaining({
        code: 'FUNCTION_NOT_FOUND',
      })
    );
  });

  test('throws FUNCTION_DISABLED if registered function is inactive', () => {
    const payload = {
      function: 'cancel_order',
      arguments: { orderId: 'ORD-123' },
    };

    expect(() => enforcePolicy(payload, mockActiveFunctions)).toThrow(
      expect.objectContaining({
        code: 'FUNCTION_DISABLED',
      })
    );
  });

  test('throws Error if function property is missing in LLM response', () => {
    const payload = {
      arguments: { foo: 'bar' },
    };

    expect(() => enforcePolicy(payload, mockActiveFunctions)).toThrow(
      'function_call response missing function name'
    );
  });
});
