const { db } = require('../../config/firebase');
const crypto = require('crypto');
const logger = require('../../config/logger');

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

const generateKey = async (tenant, params) => {
  const prefix = 'infria_pk_';
  const randomStr = crypto.randomBytes(16).toString('hex');
  const rawKey = `${prefix}${randomStr}`;
  
  // Hash implementation applied for Database Storage
  const hashedKey = hashKey(rawKey);
  
  const newRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/api_keys`).doc();
  
  await newRef.set({
    key: hashedKey, // STORE HASH
    name: params.name || 'Default API Key',
    environment: params.environment || 'production',
    createdAt: Date.now(),
    status: 'active'
  });
  
  logger.info({ apiKeyId: newRef.id }, 'API Key generated securely');
  
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
