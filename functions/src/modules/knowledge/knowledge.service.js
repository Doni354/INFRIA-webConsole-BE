const { db } = require('../../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
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
    // 1. Fetch AI Config to get BYOK OpenAI Key if the user submitted it via Web Console
    let aiConfig = null;
    const aiSnap = await db.doc(`users/${tenant.uid}/projects/${tenant.projectId}/ai_config/config`).get();
    if (aiSnap.exists) {
      aiConfig = aiSnap.data();
    }

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
      // Generate vector using BYOK (aiConfig) or fallback to process.env.OPENAI_API_KEY
      const embeddingVector = await generateEmbedding(chunkContext, aiConfig);
      
      const newRef = chunksColRef.doc();
      newBatch.set(newRef, {
        knowledgeId,
        text: chunkContext,
        embedding: FieldValue.vector(embeddingVector),
        index: i,
        createdAt: Date.now()
      });
    }
    
    await newBatch.commit();
    
    // Mark as ready and save metrics
    await docRef.update({ 
      status: 'ready', 
      indexedAt: Date.now(),
      chunkCount: chunks.length 
    });
    logger.info({ knowledgeId, chunks: chunks.length }, 'Knowledge published and embedded successfully');
    
  } catch (error) {
    logger.error({ err: error, knowledgeId }, 'Knowledge processing failed');
    await docRef.update({ status: 'failed', error: error.message });
    throw error;
  }
};

module.exports = { publishKnowledge };
