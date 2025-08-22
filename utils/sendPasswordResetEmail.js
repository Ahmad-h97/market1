// utils/sendPasswordResetEmail.js

import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
  EMAIL_USER,
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

const sendPasswordResetEmail = async (email, link) => {
  const { token: accessToken } = await oAuth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: EMAIL_USER,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });

  const mailOptions = {
    from: `"Market App" <${EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Market App Password',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>You requested to reset your password.</p>
        <p>Click the button below to choose a new one:</p>
        <a href="${link}" style="display:inline-block; background:#4CAF50; color:#fff; padding:10px 20px; text-decoration:none; margin-top:10px;">Reset Password</a>
        <p>If you didn't request this, you can ignore this email.</p>
        <p>This link expires in 1 hour.</p>
      </div>
    `,
    text: `Reset your password by clicking this link: ${link} (expires in 1 hour)`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log({
      event: 'reset_email_sent',
      messageId: info.messageId,
      recipient: email,
    });
  } catch (error) {
    console.error({
      event: 'reset_email_failed',
      error: error.message,
      recipient: email,
    });
    throw error;
  }
};

export default sendPasswordResetEmail;
