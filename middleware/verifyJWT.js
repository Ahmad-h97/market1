const jwt = require('jsonwebtoken');
const { accessTokenSecret } = require('../config/jwt.config');
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
module.exports = verifyJWT;