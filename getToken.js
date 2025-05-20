import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Step 1: Generate auth URL and show it
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});
console.log('Authorize this app by visiting this URL:', authUrl);
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

// Step 2: Add a route to handle the OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Tokens:', tokens); // <-- Save these securely

    res.send('✅ Authorization successful! Tokens printed in console.');
  } catch (err) {
    console.error('Error retrieving tokens:', err);
    res.status(500).send('❌ Error retrieving tokens.');
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
