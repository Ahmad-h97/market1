import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwtConfig.js';

const { accessTokenSecret } = jwtConfig;

const verifyJWT = (req, res, next) => {
const authHeader = req.headers['authorization'];
const token = authHeader?.split(' ')[1]; // Bearer <token>
if (!token) return res.sendStatus(401);

jwt.verify(token, accessTokenSecret, (err, decoded) => {
if (err) return res.sendStatus(403); // Invalid/expired token
req.user = decoded.username; // Attach user to request
next();
});
};

export default verifyJWT;