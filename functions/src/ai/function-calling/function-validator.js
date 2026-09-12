/**
 * Function Argument Validator — Blueprint Sec 53
 *
 * Validates that the arguments returned by the LLM match the expected
 * JSON Schema defined in the Function Registry for this project.
 *
 * Why this matters: LLMs sometimes hallucinate wrong types
 * (e.g., returning a number when a string is required). We must reject
 * invalid arguments before forwarding them to the Flutter SDK.
 */

const logger = require('../../config/logger');

/**
 * Check if a value matches the expected JSON Schema type string.
 * @param {*} value
 * @param {string} expectedType - 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
 * @returns {boolean}
 */
function matchesType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      // Unknown type — allow it (permissive for unknown custom types)
      return true;
  }
}

/**
 * Validate function arguments against the function's JSON Schema parameters.
 *
 * @param {object} args - Arguments object from LLM function_call
 * @param {object} registeredFn - Function document from Firestore, including `parameters` field
 * @throws {Error} with .code and .status if validation fails
 * @returns {true} if valid
 */
const validateArguments = (args, registeredFn) => {
  // 1. Args must be an object
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    const err = new Error('Function arguments must be a valid JSON object');
    err.code = 'INVALID_FUNCTION_ARGUMENTS';
    err.status = 400;
    throw err;
  }

  const schema = registeredFn?.parameters;

  // 2. If no schema defined, only ensure it's a plain object (MVP permissive mode)
  if (!schema || !schema.properties) {
    return true;
  }

  const properties = schema.properties;
  const requiredFields = schema.required || [];
  const errors = [];

  // 3. Check all required fields are present
  for (const field of requiredFields) {
    if (!(field in args)) {
      errors.push(`Missing required argument: "${field}"`);
    }
  }

  // 4. Check types of provided fields
  for (const [key, value] of Object.entries(args)) {
    const propSchema = properties[key];
    if (!propSchema) {
      // Unknown field — allowed in permissive mode (LLM may add extra context)
      continue;
    }
    if (propSchema.type && !matchesType(value, propSchema.type)) {
      errors.push(
        `Argument "${key}" expected type "${propSchema.type}" but received "${Array.isArray(value) ? 'array' : typeof value}"`
      );
    }
    // Enum validation
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      errors.push(
        `Argument "${key}" must be one of [${propSchema.enum.join(', ')}], received "${value}"`
      );
    }
  }

  if (errors.length > 0) {
    logger.warn({ functionName: registeredFn.name, errors }, 'Function argument validation failed');
    const err = new Error(`Invalid function arguments: ${errors.join('; ')}`);
    err.code = 'INVALID_FUNCTION_ARGUMENTS';
    err.status = 400;
    err.details = errors;
    throw err;
  }

  return true;
};

module.exports = { validateArguments, matchesType };
