import { cleanEnv, str, num, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // Database
  MONGODB_URI: url({
    desc: "MongoDB connection string",
    example: "mongodb+srv://user:pass@cluster.mongodb.net/db",
  }),

  // Server
  PORT: num({
    default: 5000,
    desc: "Port to run the server",
  }),

  // Cloudinary
  CLOUD_NAME: str({
    desc: "Cloudinary cloud name",
  }),
  CLOUD_API_KEY: str({
    desc: "Cloudinary API key",
  }),
  CLOUD_API_SECRET: str({
    desc: "Cloudinary API secret (keep secure!)",
  }),

  // JWT Secrets
  ACCESS_TOKEN_SECRET: str({
    desc: "Secret for signing JWT access tokens",
  }),
  REFRESH_TOKEN_SECRET: str({
    desc: "Secret for signing JWT refresh tokens",
  }),
});


//add .env.examples for teammates 