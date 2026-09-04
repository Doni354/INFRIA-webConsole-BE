const { db } = require('./functions/src/config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

async function testIndex() {
  try {
    const dummyVector = FieldValue.vector(new Array(1536).fill(0.1));
    const chunksRef = db.collection(`users/test/projects/test/knowledge_chunks`);
    const vectorQuery = chunksRef.findNearest('embedding', dummyVector, {
      limit: 1,
      distanceMeasure: 'COSINE' 
    });
    await vectorQuery.get();
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR CAUGHT:\n" + err.message);
  }
}
testIndex();
