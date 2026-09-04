// Blueprint Sec 26: Knowledge Processing - Chunker
const chunkText = (text, maxLength = 1000) => {
  if (!text) return [];
  
  // Clean text: inject spaces around newlines and tabs to prevent words from gluing together
  const cleanedText = text.replace(/\n/g, ' \n ').replace(/\t/g, ' ').replace(/\s{2,}/g, ' ').trim();
  
  const paragraphs = cleanedText.split(' \n ');
  const chunks = [];
  let currentChunk = "";
  
  for (let p of paragraphs) {
    const rawParagraph = p.trim();
    if (rawParagraph.length === 0) continue;
    
    // If a single paragraph is insanely massive, split it by sentences
    if (rawParagraph.length > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      const sentences = rawParagraph.split('. ');
      let currentSentenceChunk = "";
      for (let s of sentences) {
        if (currentSentenceChunk.length + s.length > maxLength) {
          chunks.push(currentSentenceChunk.trim() + '.');
          currentSentenceChunk = s;
        } else {
          currentSentenceChunk += (currentSentenceChunk.length > 0 ? ". " : "") + s;
        }
      }
      if (currentSentenceChunk.length > 0) {
        currentChunk = currentSentenceChunk; 
      }
      continue;
    }
    
    // Normal paragraph packing
    if (currentChunk.length + rawParagraph.length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = rawParagraph;
    } else {
      currentChunk += (currentChunk.length > 0 ? " \n " : "") + rawParagraph;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

module.exports = { chunkText };
