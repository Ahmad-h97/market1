import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';

const { accessTokenSecret } = jwtConfig;

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token,accessTokenSecret, (err, decoded) => {
    if (!err && decoded) {
      req.user = {
        id: decoded.id,
        role: decoded.role || 'user' // only safe fields
      };
    } else {
      req.user = null;  // Also set to null if token is invalid
    }
    next();
  });
};

export default optionalAuth;