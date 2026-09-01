const { z } = require('zod');

// Blueprint Sec 19: Minimal validation schema
const chatRequestSchema = z.object({
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000), // Max limit to prevent abuse
});

module.exports = { chatRequestSchema };
