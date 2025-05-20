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

/**
 * Sends a verification email to a user.
 * @param {string} toEmail - Recipient email address
 * @param {string} code - 6-digit verification code
 */

// Generate a test account automatically

const sendVerificationEmail = async (email, code) => {

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
      
    pool: true, // Enable connection pooling
    maxConnections: 5, // Limit concurrent sends
    debug: true,  // Enable debugging
    });

    const mailOptions = {
      from: `"Market App" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Market App Email Verification</h2>
          <p>Your verification code is:</p>
          <h3>${code}</h3>
          <p>This code expires in 15 minutes.</p>
        </div>
      `,
       text: `Your verification code is: ${code}\nExpires in 15 minutes.`, // Plain-text fallback
    };

    try {
      const info = await transporter.sendMail(mailOptions);
    console.log({ 
      event: "email_sent",
      messageId: info.messageId,
      recipient: email 
    });
  } catch (error) {
    console.error({ 
      event: "email_failed",
      error: error.message,
      recipient: email 
    });
    throw error;
  }
};

export { sendVerificationEmail };