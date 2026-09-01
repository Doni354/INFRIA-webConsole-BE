const { db } = require('../config/firebase');
const logger = require('../config/logger');

const verifyRuntimeApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: { code: 'INVALID_API_KEY', message: 'The provided API key is invalid.', requestId: req.id }
    });
  }

  try {
    const keysSnapshot = await db.collectionGroup('api_keys')
      .where('key', '==', apiKey)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (keysSnapshot.empty) {
      return res.status(401).json({
        error: { code: 'INVALID_API_KEY', message: 'The provided API key is invalid.', requestId: req.id }
      });
    }

    const keyDoc = keysSnapshot.docs[0];
    
    // Blueprint Sec 14: Tenant Resolution
    // Pattern: users/{uid}/projects/{projectId}/api_keys/{keyId}
    const pathSegments = keyDoc.ref.path.split('/');
    const uid = pathSegments[1];
    const projectId = pathSegments[3];
    
    // Blueprint Sec 13: Verify Project Ownership & Status
    const projectRef = db.doc(`users/${uid}/projects/${projectId}`);
    const projectSnap = await projectRef.get();
    
    if (!projectSnap.exists || projectSnap.data().status !== 'active') {
      return res.status(403).json({
        error: { code: 'PROJECT_SUSPENDED', message: 'The project is suspended or not found.', requestId: req.id }
      });
    }

    // TenantContext Builder
    req.tenant = {
      workspaceId: uid,
      projectId: projectId,
      apiKeyId: keyDoc.id
    };
    
    next();
  } catch (error) {
    logger.error({ err: error, reqId: req.id }, 'API Key Validation Error');
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: req.id }
    });
  }
};

module.exports = { verifyRuntimeApiKey };
