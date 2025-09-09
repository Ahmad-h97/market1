import 'dotenv/config';
import mongoose from "mongoose";
import User from "./models/User.js";
import { env } from './env.js';

async function clearSeenPosts() {
  try {
    // Connect without deprecated options
    await mongoose.connect(env.MONGODB_URI);

    // Clear seenPosts for all users
    const result = await User.updateMany({}, { $set: { seenPosts: [] } });

    console.log(`✅ Cleared seenPosts for ${result.modifiedCount} users`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error clearing seenPosts:", err);
  }
}

clearSeenPosts();
