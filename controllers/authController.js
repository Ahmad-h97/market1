import { env } from '../env.js';  // Correct
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Verification from '../models/verification.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';//to validate email ,password,url,etc....
import { sendVerificationEmail } from '../services/emailServices.js';

const validateEmail = (email) => {
  if (!validator.isEmail(email)) {
    throw new Error("Invalid email format. Example: user@example.com");
  }
  return validator.normalizeEmail(email); // This will clean the email
};

// Inline helper function
const generateVerificationCode = async (email,password,username) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

 
  const hashedpassword = await bcrypt.hash(password, 10);
  

  await Verification.findOneAndUpdate(
    { email },
    { username ,
      password: hashedpassword,
      code,
      expiresAt,
      attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendVerificationEmail(email, code);
};

const registerUser = async (req, res) => {
 
  try {

     if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Registration data is required",
        details: "Expected: { username, email, password }"
      });
    }

     const { username, email, password } = req.body;


     const missingFields = [];
    if (!username) missingFields.push("username");
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missingFields,
      });
    }
     



    const cleanemail = validateEmail(email); // change variable  name latter to avoid conflict 
    
      const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      const errors = {};
      if (existingUser.email === email) errors.email = "Email already registered";
      if (existingUser.username === username) errors.username = "Username taken";

      return res.status(409).json({
        success: false,
        conflicts: errors
      });
    }

        
      if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
        minLength: 8
      });
    }



    //const user = new User({ username, email, password,isVerified: false });
    //await user.save();


     // Generate and send verification code
    await generateVerificationCode(email,password,username);

    res.status(201).json({
      success: true,
      message: 'Verification code sent to email',
      nextStep: '/verify-email',

    });

    

     // generate tokens
/*
    const accessToken = jwt.sign(
        { id: user._id },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
        );


    const refreshToken = jwt.sign(
        { id: user._id },
        env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
        );
            
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('jwt', refreshToken, {
        httpOnly: true,  // Cookie inaccessible to JavaScript
        secure: true,    // Only sent over HTTPS
        sameSite: 'None',   // Allows cross-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });


    res.status(201).json({
        success: true,
        accessToken,
        message: 'Registration successful',
        user: { id: user._id, username: user.username}

        });
          */  

    
  } catch (err) {
    console.error("Registration error:", err);  // Log the error message
    res.status(500).json({ message: 'register Error' });
  }
};


const loginUser = async (req, res) => {
  

  try {

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


   
     // 2. Check password using bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    const accessToken = jwt.sign(
  { id: user._id },
  env.ACCESS_TOKEN_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { id: user._id },
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
            }
      });
} catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login error' });
  }
};


export { registerUser, loginUser };