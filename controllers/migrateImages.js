import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js'; // Make sure the path is correct

dotenv.config();

async function removeSuspendedField() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Remove the `suspended` field from all users
    const result = await User.updateMany(
      { suspended: { $exists: true } },
      { $unset: { suspended: "" } }
    );

    console.log(`🧹 Removed 'suspended' field from ${result.modifiedCount} users`);
  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from DB');
  }
}

removeSuspendedField();
