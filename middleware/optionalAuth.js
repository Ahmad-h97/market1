import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';



const { accessTokenSecret } = jwtConfig;

const optionalAuth = (req, res, next) => {
    console.log('Received houseId1:', req.params.id);

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    console.log("no access token");
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, accessTokenSecret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        console.log("access token expired");
        return res.status(401).json({ message: 'Access token expired' });
      } else {
        console.log("invalid access token");
        req.user = null;
        return next(); // treat as guest if invalid
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role || 'user'
    };
    console.log("valid access token");
    next();
  });
};

export default optionalAuth;
