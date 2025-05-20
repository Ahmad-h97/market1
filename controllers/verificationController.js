import Verification from '../models/verification.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';



// POST /verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    const record = await Verification.findOne({ email });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "No verification request found for this email",
      });
    }

    // Limit attempts
    if (record.attempts >= 5) {
      await Verification.deleteOne({ email });
      return res.status(429).json({
        success: false,
        error: "Too many incorrect attempts. Please request a new code.",
      });
    }

    // Check if code is valid
    if (record.code !== code) {
      record.attempts += 1;
      await record.save();

      return res.status(401).json({
        success: false,
        error: "Invalid verification code",
        attemptsLeft: 5 - record.attempts,
      });
    }


       const { username, password } = record;

       const user = new User({ username, email, password});
    await user.save();

       const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

  user.refreshToken = refreshToken;
await user.save();
 
     await Verification.deleteOne({ email });


    // Create tokens
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    

    // Send refresh token as secure HTTP-only cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true, // Set to false in development if not using HTTPS
      sameSite: 'None', // Or 'Lax' if your frontend is on the same domain
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Server error during verification" });
  }
};

export { verifyEmail };
