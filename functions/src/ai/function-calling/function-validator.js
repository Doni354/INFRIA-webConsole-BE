const validateArguments = (args, schema) => {
  // For MVP, explicitly ensure args is an object.
  // Advanced json schema compiling (using Ajv/Zod) against `registeredFn.parameters`
  // will be done here in future phases.
  if (typeof args !== 'object' || args === null) {
    const err = new Error('Function arguments must be a valid JSON object');
    err.code = 'INVALID_FUNCTION_ARGUMENTS';
    err.status = 400;
    throw err;
  }
  
  return true;
};

module.exports = { validateArguments };
