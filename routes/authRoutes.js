import express from 'express';
import { registerUser, loginUser, refreshToken,LogoutUser,changePassword,resetPassword  } from '../controllers/authController.js';
import { verifyEmail } from '../controllers/verificationController.js';
import { uploadProfileImages } from '../middleware/upload.js';
import verifyJWT from '../middleware/verifyJWT.js';
import { forgotPassword } from '../controllers/authController.js';


const router = express.Router();



router.post('/register',uploadProfileImages, registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.get('/refresh', refreshToken);
router.post('/logout', LogoutUser);
router.patch('/change-password',verifyJWT, changePassword)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;

