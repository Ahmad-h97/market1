import mongoose from 'mongoose';
import dotenv from 'dotenv';
import House from '../models/House.js';

dotenv.config();

async function migrateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all houses missing either field
    const houses = await House.find({
      $or: [
        { imagesUltra: { $exists: false } },
        { imagesPost: { $exists: false } }
      ]
    });

    console.log(`🏠 Found ${houses.length} houses to update`);

    for (const house of houses) {
      let updated = false;

      if (!house.imagesUltra) {
        house.imagesUltra = [];
        updated = true;
      }

      if (!house.imagesPost) {
        house.imagesPost = [];
        updated = true;
      }

      if (updated) {
        await house.save();
        console.log(`✔️ Updated house ID: ${house._id}`);
      }
    }

    console.log('✅ Migration complete');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from DB');
  }
}

migrateImages();
