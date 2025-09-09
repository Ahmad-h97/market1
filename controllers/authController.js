import { env } from '../env.js';  // Correct
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Verification from '../models/verification.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';//to validate email ,password,url,etc....
import { sendVerificationEmail } from '../services/emailServices.js';
import crypto from 'crypto';
import sendPasswordResetEmail from '../utils/sendPasswordResetEmail.js';
import checkSuspension from '../utils/checkSuspension.js';


const validateEmail = (Email) => {
  if (!validator.isEmail(Email)) {
    throw new Error("Invalid email format. Example: user@example.com");
  }
  return validator.normalizeEmail(Email); // This will clean the email
};

// Inline helper function
const generateVerificationCode = async (email,password,username,city,profileImage) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

 
  const hashedpassword = await bcrypt.hash(password, 10);
  
  await sendVerificationEmail(email, code);
  
 


  await Verification.findOneAndUpdate(
    { email },
    { username ,
      city,
      profileImage,
      password: hashedpassword,
      code,
      expiresAt,
      attempts: 0,
      $inc: { codeRequestCount: 1 },},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  
};

const registerUser = async (req, res) => {
 
  try {
    console.log('register request')
   
 
      if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Registration data is required",
        details: "Expected: { username, Email, password, city }",
      });
    }
     const { username, Email, password,city } = req.body;
    

     const missingFields = [];
    if (!username) missingFields.push("username");
    if (!Email) missingFields.push("Email");
    if (!password) missingFields.push("password");
    if (!city) missingFields.push("city");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missingFields,
      });
    }
     



    const email = validateEmail(Email); // change variable  name latter to avoid conflict 
    
      const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

  if (existingUser) {
  if (existingUser.email === email) {
    return res.status(409).json({
      success: false,
      message: "Email is already registered",
      code: "EMAIL_EXISTS",
      field: "Email",
    });
  }

  if (existingUser.username === username) {
    return res.status(409).json({
      success: false,
      message: "Username is already taken",
      code: "USERNAME_EXISTS",
      field: "username",
    });
  }
}

        
      if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
        minLength: 8
      });
    }

      const existing = await Verification.findOne({ email });

    if (existing && existing.codeRequestCount >= 3) {
      return res.status(401).json({
        success: false,
        error: "too many tries , try again after 15 minutes",
      });
    }
  const profileImageUltra = req.files?.profileImageUltra?.[0]?.path || null;
    const profileImageCompressed = req.files?.profileImageCompressed?.[0]?.path || null;

    console.log("profileImageUltra:", profileImageUltra);
    console.log("profileImageCompressed:", profileImageCompressed);

    // Pass both image URLs to your generateVerificationCode function or user creation logic
    await generateVerificationCode(email, password, username, city, {
      ultra: profileImageUltra,
      compressed: profileImageCompressed,
    });

    
    res.status(201).json({
      success: true,
      message: 'Verification code sent to email',
      nextStep: '/verify-email',

    });

    
  } catch (err) {
    console.error("Registration error:", err);  // Log the error message
   res.status(500).json({ 
  success: false,
  error: 'Registration failed',
  message: err.message, // the error string (e.g. "Cannot read properties of null")
  stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // optional for debugging
});
  }
};


const loginUser = async (req, res) => {
  

  try {
    console.log(req.body);
    console.log('login rewquest');
     if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Registration data is required",
        details: "Expected: { email, password }"
      });
    }

    const { email, password } = req.body;

     if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missingFields: [
          ...(email ? [] : ['email']),
          ...(password ? [] : ['password']),
        ]
      });
    }

      if (!validator.isEmail(email)) {
  return res.status(400).json({
    success: false,
    error: "Invalid email format",
    example: "user@example.com"
  });
}
  
    
       // 1. Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

 const suspensionStatus = await checkSuspension(user);
    if (suspensionStatus.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
        reason: suspensionStatus.reason,
        suspendedUntil: suspensionStatus.suspendedUntil,
      });
    }
   
     // 2. Check password using bcrypt
     console.log('Password entered:', password);
console.log('Stored hash:', user.password);
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log(isMatch)
      return res.status(402).json({ success: false, error: 'Invalid password' });
    }
    // return it to 401 later s
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

user.refreshToken = refreshToken;
await user.save();

// Send refresh token as secure HTTP-only cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true, // Set to false in development if not using HTTPS
      sameSite: 'None', // Or 'Lax' if your frontend is on the same domain
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 3. Success
      res.status(200).json({
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          profileImage: user.profileImage,
           role: user.role
            }
      });
} catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login error' });
  }
};

const refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401); // No cookie

  const refreshToken = cookies.jwt;
  try {
    const foundUser = await User.findOne({ refreshToken });

   
    if (!foundUser) return res.sendStatus(403); // Forbidden
   
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err || foundUser._id.toString() !== decoded.id) return res.sendStatus(403);

      const accessToken = jwt.sign(
        { id: foundUser._id, role: foundUser.role   },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
      );

      res.json({ accessToken,
        foundUser
      });
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.sendStatus(500);
  }
};


const LogoutUser = async (req, res) => {
  
  console.log('logout');
  const refreshToken = req.cookies?.jwt;
  if (!refreshToken) return res.sendStatus(204); // No content, no refresh token sent

  
  console.log('Refresh token before logout:', refreshToken);

  // Find user with this refresh token
  const user = await User.findOne({ refreshToken });
  if (!user) {
    console.log('dddccc')
    // Token not found in DB, clear cookie anyway
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
    return res.sendStatus(204);
  }

  // Remove refresh token from user in DB
  console.log('User refresh token before clearing:', user.refreshToken);
  user.refreshToken = '';
  await user.save();
  console.log('User refresh token after clearing:', user.refreshToken);

  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};


const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Old password is incorrect' });
  }

  // Manually hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Assign hashed password and tell schema to skip auto-hashing
  user.password = hashedPassword;
  user.skipHashing = true;

  await user.save();

  res.json({ message: 'Password changed successfully' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'If that email is registered, a reset link was sent' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour

  user.resetToken = token;
  user.resetTokenExpires = new Date(expires);
  await user.save();
  const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL;
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  res.json({ message: 'If that email is registered, a reset link was sent' });
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Find user by reset token and check expiry
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }, // token not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token fields
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    // Use skipHashing flag if your pre-save hook hashes password
    user.skipHashing = false;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('[ResetPassword] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export {resetPassword , forgotPassword ,registerUser, loginUser,refreshToken,LogoutUser,changePassword };
