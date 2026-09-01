const { db } = require('../../config/firebase');
const { chunkText } = require('../../ai/rag/chunker');
const { generateEmbedding } = require('../../ai/rag/embedding.service');
const logger = require('../../config/logger');

const publishKnowledge = async (tenant, knowledgeId, rawText) => {
  // Tenant context here is just uid based on verifyConsoleAuth (since user comes from console)
  // Blueprint Sec 43/50: Path requires UID / workspace mapping
  const docRef = db.doc(`users/${tenant.uid}/projects/${tenant.projectId}/knowledge/${knowledgeId}`);
  
  // Mark as processing
  await docRef.update({ status: 'processing', updatedAt: Date.now() });
  
  try {
    const chunks = chunkText(rawText);
    const chunksColRef = db.collection(`users/${tenant.uid}/projects/${tenant.projectId}/knowledge_chunks`);
    
    // First, delete old chunks for this knowledgeId (for reindexing / updating)
    const oldChunks = await chunksColRef.where('knowledgeId', '==', knowledgeId).get();
    const batch = db.batch();
    oldChunks.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    
    // Process new chunks sequentially to avoid rate limits (or use Promise.all for speed if limit allows)
    const newBatch = db.batch();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkContext = chunks[i];
      // Generate vector
      // In a real flow, aiConfig.providerApiKey comes from project config DB. 
      // For MVP, passing null means it will use process.env.OPENAI_API_KEY
      const embeddingVector = await generateEmbedding(chunkContext, null);
      
      const newRef = chunksColRef.doc();
      newBatch.set(newRef, {
        knowledgeId,
        text: chunkContext,
        embedding: embeddingVector, // FieldValue.vector not strictly required on set if using raw array, firestore SDK converts it. But safest if needed. We'll rely on array for write.
        index: i,
        createdAt: Date.now()
      });
    }
    
    await newBatch.commit();
    
    // Mark as ready
    await docRef.update({ status: 'ready', indexedAt: Date.now() });
    logger.info({ knowledgeId }, 'Knowledge published and embedded successfully');
    
  } catch (error) {
    logger.error({ err: error, knowledgeId }, 'Knowledge processing failed');
    await docRef.update({ status: 'failed', error: error.message });
    throw error;
  }
};

module.exports = { publishKnowledge };
