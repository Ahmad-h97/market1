import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';

const { accessTokenSecret } = jwtConfig;

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, accessTokenSecret, (err, decoded) => {
    console.log('🛡️  JWT Middleware:', { token, decoded, error: err });
   if (err) {
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
      req.user = {
      id: decoded.id,
      role: decoded.role || 'user',  // default if needed
      email: decoded.email           // if you're including it in the token
    };
    next();
  });
};

export default verifyJWT;