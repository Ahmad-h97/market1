import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';

const { accessTokenSecret } = jwtConfig;

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401); // Better safety

  const token = authHeader.split(' ')[1];

  jwt.verify(token, accessTokenSecret, (err, decoded) => {
    if (err) return res.sendStatus(403); // Token invalid or expired

      req.user = {
      id: decoded.id,
      role: decoded.role || 'user',  // default if needed
      email: decoded.email           // if you're including it in the token
    };
    next();
  });
};

export default verifyJWT;