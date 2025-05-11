import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import { verifyEmail } from '../controllers/verificationController.js';

const router = express.Router();



router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);


export default router;

