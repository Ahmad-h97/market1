import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';
import User from '../models/User.js';

const { accessTokenSecret } = jwtConfig;

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log('🔐 Authorization Header:', authHeader);

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    console.log('🛡️ JWT Decoded:', decoded);

    const user = await User.findById(decoded.id).select('_id role email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

     if (user.banned?.isBanned) {
      return res.status(403).json({
        message: 'Account is banned',
        reason: user.banned.reason || 'No reason provided',
      });
    }
    
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

export default verifyJWT;
