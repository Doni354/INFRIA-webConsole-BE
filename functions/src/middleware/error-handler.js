const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ err, reqId: req.id }, 'Unhandled error');

  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      requestId: req.id,
    }
  });
};

module.exports = { errorHandler };
