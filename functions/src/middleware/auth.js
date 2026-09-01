const { auth } = require('../config/firebase');
const logger = require('../config/logger');

const verifyConsoleAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header', requestId: req.id }
    });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    logger.error({ err: error, reqId: req.id }, 'Invalid Firebase ID token');
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', requestId: req.id }
    });
  }
};

module.exports = { verifyConsoleAuth };
