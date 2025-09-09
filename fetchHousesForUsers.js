import 'dotenv/config'; 
import mongoose from 'mongoose';
import axios from 'axios';
import User from './models/User.js';
import { env } from './env.js';

mongoose.connect(env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error(err));

const endpoint = 'http://localhost:5000/api/houses/houses';
const refreshEndpoint = 'http://localhost:5000/api/auth/refresh';

async function getValidAccessToken(user) {
  try {
    const res = await axios.get(refreshEndpoint, {
      headers: { Cookie: `jwt=${user.refreshToken}` },
      withCredentials: true
    });
    return res.data.accessToken;
  } catch {
    console.log(`❌ User ${user.username} failed to refresh token`);
    return null;
  }
}

async function fetchForUser(user) {
  const startTime = Date.now();
  console.log(`➡️ Sending request for user ${user.username}...`);

  let accessToken = await getValidAccessToken(user);
  if (!accessToken) return;

  try {
    await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const endTime = Date.now();
    console.log(`✅ User ${user.username} received response in ${endTime - startTime} ms`);
  } catch (err) {
    console.log(`❌ Request failed for user ${user.username}: ${err.message}`);
  }
}


// Fetch multiple users in parallel
async function fetchUsersParallel(usernames) {
  const promises = usernames.map(username =>
    User.findOne({ username }).then(user => {
      if (user) fetchForUser(user); // fire independently
    })
  );

  await Promise.all(promises); // optional wait for all to trigger
}

// All usernames to fetch
const beforeGroup = ['test477'];
const groupUsers = Array.from({ length: 30 }, (_, i) => `test${i}`); // test0 - test99
const afterGroup = ['test577'];

// Fire all requests in parallel
fetchUsersParallel([...beforeGroup, ...groupUsers, ...afterGroup]);
