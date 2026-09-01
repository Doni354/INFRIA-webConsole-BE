const { z } = require('zod');
const apiKeyService = require('./api-key.service');

const generateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().optional(),
  environment: z.string().optional()
});

const revokeSchema = z.object({
  projectId: z.string().min(1),
  keyId: z.string().min(1),
});

const handleGenerate = async (req, res, next) => {
  try {
    const parse = generateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'INVALID_REQUEST' } });
    }
    const tenant = { uid: req.user.uid, projectId: parse.data.projectId };
    const result = await apiKeyService.generateKey(tenant, parse.data);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

const handleRevoke = async (req, res, next) => {
  try {
    const parse = revokeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'INVALID_REQUEST' } });
    }
    const tenant = { uid: req.user.uid, projectId: parse.data.projectId };
    await apiKeyService.revokeKey(tenant, parse.data.keyId);
    res.status(200).json({ status: 'success' });
  } catch (error) { next(error); }
};

module.exports = { handleGenerate, handleRevoke };
