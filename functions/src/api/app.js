const express = require('express');
const cors = require('cors');
const { generateRequestId } = require('../shared/utils/request-id');
const { errorHandler } = require('../middleware/error-handler');
const logger = require('../config/logger');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Request ID Generation
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || generateRequestId();
  next();
});

// Request Logging
app.use((req, res, next) => {
  logger.info({ reqId: req.id, method: req.method, url: req.url }, 'Incoming request');
  next();
});

// Health check endpoint (Phase 1 Acceptance)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// V1 Routes
const runtimeRoutes = require('../modules/runtime/runtime.routes');
const knowledgeRoutes = require('../modules/knowledge/knowledge.routes');
const apiKeyRoutes = require('../modules/api-keys/api-key.routes');
const functionRoutes = require('../modules/functions/function.routes');

app.use('/v1/runtime', runtimeRoutes);
app.use('/v1/knowledge', knowledgeRoutes);
app.use('/v1/api-keys', apiKeyRoutes);
app.use('/v1/functions', functionRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
