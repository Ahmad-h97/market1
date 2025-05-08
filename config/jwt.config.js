const jwtConfig = {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    // You can add other JWT-related configurations here
    // For example:
    // accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    // refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  };
  
  module.exports = jwtConfig;