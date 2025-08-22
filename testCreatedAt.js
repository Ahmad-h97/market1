import mongoose from 'mongoose';
import dotenv from 'dotenv';
import House from './models/House.js'; // adjust path if needed

dotenv.config();

async function testGetAllHouses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all houses, sorted by createdAt descending (newest first)
    const houses = await House.find({})
      .sort({ createdAt: -1 })
      .select('_id createdAt location'); // select only needed fields

    if (houses.length === 0) {
      console.log('No houses found');
      return;
    }

    // Log each house's _id, createdAt, and location
    houses.forEach(house => {
      console.log(`House ID: ${house._id.toString()}`);
      console.log(`Created At: ${house.createdAt.toISOString()}`);
      console.log(`Location: ${house.location}`);
      console.log('---');
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from DB');
  }
}

testGetAllHouses();
