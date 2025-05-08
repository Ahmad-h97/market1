const User = require('../models/User');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
        }
        
        const duplicate = await User.findOne({ $or: [{ email }, { username }] });
        if (duplicate) {
        return res.status(409).json({ error: 'Email or username already exists' });
        }
        


    const user = new User({ username, email, password });
    await user.save();

    const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
        );


    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
        );
            
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });


    res.status(201).json({
        success: true,
        accessToken,
        message: 'User created',
        user: { id: user._id, username: user.username, email: user.email }

        });
            

    
  } catch (err) {
    console.error('Error creating user:', err.message);  // Log the error message
    res.status(500).json({ message: 'register Error' });
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Check password directly (NOT secure, but okay for learning)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 3. Success
    res.status(200).json({ message: 'Login successful', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'login error' });
  }
};


module.exports = { registerUser,loginUser };