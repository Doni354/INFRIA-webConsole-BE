const { z } = require('zod');
const knowledgeService = require('./knowledge.service');

const publishSchema = z.object({
  projectId: z.string().min(1),
  knowledgeId: z.string().min(1),
  text: z.string().min(1),
});

const handlePublish = async (req, res, next) => {
  try {
    const parse = publishSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing parameters' }
      });
    }
    
    const { projectId, knowledgeId, text } = parse.data;
    
    // req.user comes from verifyConsoleAuth
    const tenant = {
      uid: req.user.uid,
      projectId: projectId
    };
    
    // Async processing. We can respond immediately with 202 Accepted, and let processing run in background,
    // or await it if we want synchronous result. Blueprint Sec 26 implies state updates: draft -> processing -> ready.
    // For cloud functions, we must await it or the process gets killed.
    await knowledgeService.publishKnowledge(tenant, knowledgeId, text);
    
    res.status(200).json({ status: 'success', message: 'Knowledge successfully indexed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { handlePublish };
