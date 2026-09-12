const { validateArguments, matchesType } = require('../../ai/function-calling/function-validator');

describe('Function Argument Validator (Blueprint Sec 53, 64)', () => {
  const registeredFn = {
    name: 'track_package',
    parameters: {
      type: 'object',
      properties: {
        trackingNumber: { type: 'string', description: 'The tracking number' },
        carrier: { type: 'string', enum: ['JNE', 'JNT', 'SiCepat'] },
        maxAttempts: { type: 'integer' },
        detailed: { type: 'boolean' },
      },
      required: ['trackingNumber', 'carrier'],
    },
  };

  test('validates correct arguments matching schema', () => {
    const validArgs = {
      trackingNumber: 'JNE123456',
      carrier: 'JNE',
      maxAttempts: 3,
      detailed: true,
    };

    expect(validateArguments(validArgs, registeredFn)).toBe(true);
  });

  test('rejects non-object arguments', () => {
    expect(() => validateArguments('string', registeredFn)).toThrow(
      expect.objectContaining({ code: 'INVALID_FUNCTION_ARGUMENTS' })
    );

    expect(() => validateArguments(null, registeredFn)).toThrow(
      expect.objectContaining({ code: 'INVALID_FUNCTION_ARGUMENTS' })
    );

    expect(() => validateArguments([1, 2], registeredFn)).toThrow(
      expect.objectContaining({ code: 'INVALID_FUNCTION_ARGUMENTS' })
    );
  });

  test('rejects missing required parameters', () => {
    const incompleteArgs = {
      trackingNumber: 'JNE123456',
      // carrier missing
    };

    expect(() => validateArguments(incompleteArgs, registeredFn)).toThrow(
      expect.objectContaining({
        code: 'INVALID_FUNCTION_ARGUMENTS',
      })
    );
  });

  test('rejects incorrect data types (e.g. number when string expected)', () => {
    const wrongTypeArgs = {
      trackingNumber: 123456, // should be string
      carrier: 'JNE',
    };

    expect(() => validateArguments(wrongTypeArgs, registeredFn)).toThrow(
      expect.objectContaining({
        code: 'INVALID_FUNCTION_ARGUMENTS',
      })
    );
  });

  test('rejects invalid enum value', () => {
    const invalidEnumArgs = {
      trackingNumber: 'JNE123456',
      carrier: 'FedEx', // Not in ['JNE', 'JNT', 'SiCepat']
    };

    expect(() => validateArguments(invalidEnumArgs, registeredFn)).toThrow(
      expect.objectContaining({
        code: 'INVALID_FUNCTION_ARGUMENTS',
      })
    );
  });

  test('permissive mode when no properties defined in schema', () => {
    const looseFn = {
      name: 'ping_service',
      parameters: { type: 'object' },
    };

    expect(validateArguments({ anyKey: 123 }, looseFn)).toBe(true);
  });

  test('matchesType handles all primitives correctly', () => {
    expect(matchesType('hello', 'string')).toBe(true);
    expect(matchesType(42, 'number')).toBe(true);
    expect(matchesType(42, 'integer')).toBe(true);
    expect(matchesType(42.5, 'integer')).toBe(false);
    expect(matchesType(true, 'boolean')).toBe(true);
    expect(matchesType([1, 2], 'array')).toBe(true);
    expect(matchesType({ a: 1 }, 'object')).toBe(true);
  });
});
