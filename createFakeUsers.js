import 'dotenv/config'
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js"; // your User model
import jwt from 'jsonwebtoken';
import { env } from './env.js'; // make sure env has ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET


// Connect to MongoDB
mongoose.connect(env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Random city helper
const cities = [
  "Damascus", "Aleppo", "Homs", "Hama", 
  "Latakia", "Tartus", "Raqqa", "Deir ez-Zor", "Daraa", "Hasakah"
];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

// Random date within last month
function getRandomDate() {
  const now = new Date();
  const pastMonth = new Date();
  pastMonth.setMonth(now.getMonth() - 1);
  return new Date(pastMonth.getTime() + Math.random() * (now.getTime() - pastMonth.getTime()));
}

// Insert users
async function createUsers() {
  for (let i = 0; i < 1000; i++) {
    const username = `test${i}`;
    const email = `test${i}@test.com`;

    const password = `testtest${i}`;
    const createdAt = getRandomDate();
    const updatedAt = getRandomDate();

    // 1. Create the user document
    const user = new User({
      username,
      email,
      password,
      role: "user",
      city: getRandomCity(),
      profileImage: {},
      following: [],
      followers: [],
      postedHouses: [],
      favorites: [],
      clickedPosts: [],
      seenPosts: [],
      credibilityScore: 50,
      createdAt,
      updatedAt
    });

    // 2. Save to get _id
    await user.save();

    // 3. Generate JWTs using the real _id
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Save refreshToken to user
    user.refreshToken = refreshToken;
    await user.save();

    console.log(`✅ Created user: ${username}`);
    console.log(`   AccessToken: ${accessToken}`);
    console.log(`   RefreshToken: ${refreshToken}`);
  }

  mongoose.disconnect();
}



createUsers();
