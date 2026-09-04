@echo off
gcloud firestore indexes composite create --project=infria-e1260 --collection-group=knowledge_chunks --query-scope=COLLECTION --field-config="vector-config={\"dimension\":\"1536\",\"flat\":{}},field-path=embedding"
