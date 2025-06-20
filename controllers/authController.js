import { env } from '../env.js';  // Correct
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Verification from '../models/verification.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';//to validate email ,password,url,etc....
import { sendVerificationEmail } from '../services/emailServices.js';


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
    console.log("register info ",req.file)
 
     if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Registration data is required",
        details: "Expected: { username, email, password }"
      });
    }

     const { username, Email, password,city } = req.body;
    console.log(city)

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

      const existing = await Verification.findOne({ email });

    if (existing && existing.codeRequestCount >= 3) {
      return res.status(401).json({
        success: false,
        error: "too many tries , try again after 15 minutes",
      });
    }

    const profileImage = req.file?.path || null;
    console.log("profileImage",profileImage)
     // Generate and send verification code
    await generateVerificationCode(email,password,username,city,profileImage);

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
     console.log('Password entered:', password);
console.log('Stored hash:', user.password);
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log(isMatch)
      return res.status(402).json({ success: false, error: 'Invalid password' });
    }
    // return it to 401 later s
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
          profileImage: user.profileImage
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
        { id: foundUser._id,  },
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

const LogoutUser = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};


export { registerUser, loginUser,refreshToken,LogoutUser };
