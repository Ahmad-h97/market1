
const express = require('express');
const router = express.Router();  // Define the router here
const { registerUser,loginUser } = require('../controllers/authController');






router.post('/register', registerUser);
router.post('/login', loginUser);



module.exports = router;