// Blueprint Sec 26: Knowledge Processing - Chunker
const chunkText = (text, maxLength = 1000, overlap = 200) => {
  if (!text) return [];
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + maxLength;
    
    if (endIndex < text.length) {
      // Look for a natural break: newline first, then period.
      let breakIndex = text.lastIndexOf('\n', endIndex);
      if (breakIndex > startIndex + (maxLength / 2)) {
        endIndex = breakIndex;
      } else {
        breakIndex = text.lastIndexOf('. ', endIndex);
        if (breakIndex > startIndex + (maxLength / 2)) {
          endIndex = breakIndex + 1; 
        }
      }
    }
    
    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
    
    if (startIndex >= text.length || endIndex <= startIndex) break;
  }
  
  return chunks.filter(c => c.length > 0);
};

module.exports = { chunkText };
