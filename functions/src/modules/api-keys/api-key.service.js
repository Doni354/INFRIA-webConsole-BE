const { db } = require('../../config/firebase');
const crypto = require('crypto');
const logger = require('../../config/logger');

const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

const generateKey = async (tenant, params) => {
  const prefix = 'infria_pk_';
  const randomStr = crypto.randomBytes(16).toString('hex');
  const rawKey = `${prefix}${randomStr}`;
  
  const hashedKey = hashKey(rawKey);
  
  const newRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/api_keys`).doc();
  
  await newRef.set({
    key: hashedKey, // STORE HASH
    name: params.name || 'Default API Key',
    environment: params.environment || 'production',
    createdAt: Date.now(),
    status: 'active'
  });

  // Fast-Lane O(1) Global Lookup mapping (Bypass collectionGroup index requirement)
  await db.collection('global_api_keys').doc(hashedKey).set({
    workspaceId: tenant.uid,
    projectId: tenant.projectId,
    keyId: newRef.id,
    status: 'active'
  });
  
  logger.info({ apiKeyId: newRef.id }, 'API Key generated securely');
  
  // Return the raw key ONCE securely back to the Console frontend.
  return { id: newRef.id, key: rawKey };
};

const revokeKey = async (tenant, keyId) => {
  const docRef = db.doc(`users/${tenant.uid}/projects/${tenant.projectId}/api_keys/${keyId}`);
  
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw Object.assign(new Error('Key not found'), { status: 404 });
  }

  const keyData = docSnap.data();

  // Dual revoke
  await docRef.update({ 
    status: 'revoked',
    revokedAt: Date.now()
  });

  if (keyData.key) {
    // keyData.key contains the Hashed String.
    await db.collection('global_api_keys').doc(keyData.key).update({
      status: 'revoked'
    }).catch(() => null); // ignore if it doesn't exist to not break backwards compatibility
  }

  logger.info({ keyId }, 'API Key revoked successfully');
  return { status: 'success' };
};

module.exports = { generateKey, revokeKey };
