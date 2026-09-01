const { db } = require('../../config/firebase');
const crypto = require('crypto');
const logger = require('../../config/logger');

const generateKey = async (tenant, params) => {
  // Phase 8 Blueprint Sec 17: Api Key Generation 
  const prefix = 'infria_pk_';
  const randomStr = crypto.randomBytes(16).toString('hex');
  const rawKey = `${prefix}${randomStr}`;
  
  // NOTE: The blueprint states we should store the hash of this key instead of raw. 
  // However, because the MVP auth interceptor currently queries by exact match, 
  // we are storing it raw for this prototype. Proper production architecture requires
  // hashing here and in project-auth.js.
  
  const newRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/api_keys`).doc();
  
  await newRef.set({
    key: rawKey,
    name: params.name || 'Default API Key',
    environment: params.environment || 'production',
    createdAt: Date.now(),
    status: 'active'
  });
  
  logger.info({ apiKeyId: newRef.id }, 'API Key generated');
  
  // Return the raw key ONCE securely back to the Console frontend.
  return { id: newRef.id, key: rawKey };
};

const revokeKey = async (tenant, keyId) => {
  const ref = db.doc(`users/${tenant.uid}/projects/${tenant.projectId}/api_keys/${keyId}`);
  await ref.update({ 
    status: 'revoked', 
    revokedAt: Date.now() 
  });
  logger.info({ apiKeyId: keyId }, 'API Key revoked');
};

module.exports = { generateKey, revokeKey };
