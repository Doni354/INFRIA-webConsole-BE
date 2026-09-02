const { db } = require('../config/firebase');
const crypto = require('crypto');
const logger = require('../config/logger');

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

const verifyRuntimeApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: { code: 'INVALID_API_KEY', message: 'The provided API key is invalid.', requestId: req.id }
    });
  }

  try {
    const hashedKey = hashKey(apiKey);
    
    // Fast-Lane O(1) Index-free Validation 
    const globalKeyRef = await db.collection('global_api_keys').doc(hashedKey).get();

    if (!globalKeyRef.exists || globalKeyRef.data().status !== 'active') {
      return res.status(401).json({
        error: { code: 'INVALID_API_KEY', message: 'The provided API key is invalid or revoked.', text_debug: hashedKey, requestId: req.id }
      });
    }

    const keyData = globalKeyRef.data();
    
    // Blueprint Sec 13: Verify Project Ownership & Status
    const projectRef = db.doc(`users/${keyData.workspaceId}/projects/${keyData.projectId}`);
    const projectSnap = await projectRef.get();
    
    if (!projectSnap.exists || projectSnap.data().status !== 'active') {
      return res.status(403).json({
        error: { code: 'PROJECT_SUSPENDED', message: 'The project is suspended or not found.', requestId: req.id }
      });
    }

    // TenantContext Builder
    req.tenant = {
      workspaceId: keyData.workspaceId,
      projectId: keyData.projectId,
      apiKeyId: keyData.keyId
    };
    
    next();
  } catch (error) {
    logger.error({ err: error, reqId: req.id }, 'API Key Validation Error');
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: req.id }
    });
  }
};

const { auth } = require('../config/firebase');

const verifyConsoleAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header', requestId: req.id }
    });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    logger.error({ err: error, reqId: req.id }, 'Invalid Firebase ID token');
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', requestId: req.id }
    });
  }
};

module.exports = { verifyRuntimeApiKey, verifyConsoleAuth };
