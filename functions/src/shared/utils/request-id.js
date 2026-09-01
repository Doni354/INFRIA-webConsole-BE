const { v4: uuidv4 } = require('uuid');

const generateRequestId = () => {
  return `req_${uuidv4().replace(/-/g, '')}`;
};

module.exports = { generateRequestId };
