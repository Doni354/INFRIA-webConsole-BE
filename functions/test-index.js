const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function testIndex() {
  try {
    const dummyVector = admin.firestore.FieldValue.vector(new Array(1536).fill(0.1));
    const chunksRef = db.collection(`users/test/projects/test/knowledge_chunks`);
    const vectorQuery = chunksRef.findNearest('embedding', dummyVector, {
      limit: 1,
      distanceMeasure: 'COSINE' 
    });
    await vectorQuery.get();
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR_CAUGHT_FOR_USER_LINK:\n" + err.message);
  }
}
testIndex();
