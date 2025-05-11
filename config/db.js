import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { // Changed from MONGO_URI
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000, // Added socket timeout
      serverSelectionTimeoutMS: 5000 // Added server selection timeout
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

export default connectDB;