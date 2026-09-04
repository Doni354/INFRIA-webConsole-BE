const { admin, db } = require('../../config/firebase');
const { FieldValue } = admin.firestore;
const { generateEmbedding } = require('./embedding.service');
const logger = require('../../config/logger');

// Blueprint Sec 23-25: RAG Query Policy with Threshold and Fallback
const retrieveContext = async (tenant, aiConfig, query, topK = 5) => {
  if (aiConfig && aiConfig.knowledgeEnabled === false) {
    return { context: [], fallback: false };
  }

  logger.info({ projectId: tenant.projectId }, 'Generating query embedding for RAG Retrieval');
  
  try {
    // 1. Generate query embedding vector
    const queryVectorArray = await generateEmbedding(query, aiConfig);
    const queryVector = FieldValue.vector(queryVectorArray);

    // 2. Perform Vector Search natively in Firestore
    // Blueprint Sec 24, 66: Tenant scoped search 
    // Data isolated deeply by UID & ProjectId
    const chunksRef = db.collection(`users/${tenant.workspaceId}/projects/${tenant.projectId}/knowledge_chunks`);
    
    const simThreshold = aiConfig && typeof aiConfig.retrievalThreshold === 'number' ? aiConfig.retrievalThreshold : 0.70;
    const searchTopK = aiConfig && typeof aiConfig.retrievalTopK === 'number' ? aiConfig.retrievalTopK : topK;
    const maxCosineDistance = 1.0 - simThreshold; // Firestore Cosine Distance = 1 - Similarity (OpenAI embedded)

    // Nearest neighbor search with STRICT Cosine Threshold
    const vectorQuery = chunksRef.findNearest('embedding', queryVector, {
      limit: searchTopK,
      distanceMeasure: 'COSINE',
      distanceThreshold: maxCosineDistance
    });

    const snapshot = await vectorQuery.get();
    const contextLines = [];
    
    snapshot.forEach(doc => {
      // 3. Assemble chunks
      if (doc.data().text) {
        contextLines.push(doc.data().text);
      }
    });

    if (contextLines.length === 0) {
      // Blueprint Sec 25: NO_RELEVANT_CONTEXT fallback protocol
      return { 
        context: [], 
        fallback: true, 
        fallbackMessage: 'Informasi tersebut belum tersedia dalam knowledge base.' 
      };
    }

    return {
      context: contextLines,
      fallback: false
    };

  } catch (error) {
    logger.error({ err: error }, 'Vector retrieval failed');
    // Graceful degrade if vector index is missing or OpenAI fails 
    return { 
      context: [], 
      fallback: true, 
      fallbackMessage: 'System is experiencing issues retrieving knowledge context.' 
    };
  }
};

module.exports = { retrieveContext };
