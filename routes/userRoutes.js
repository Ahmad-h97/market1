import express from 'express';
import  verifyJWT  from '../middleware/verifyJWT.js';
import { markFav, removeFav,toggleFollow,changeProfileImage,hideUser,suspendUser } from '../controllers/userController.js';
import { uploadProfileImages } from '../middleware/upload.js';
import { flagDeleteAccount } from '../controllers/userController.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();  // Define the router here



router.post('/:userId/interested/:houseId',verifyJWT, markFav);
router.delete('/:userId/interested/:houseId',verifyJWT, removeFav);
router.post('/follow/:id', verifyJWT, toggleFollow);
router.put('/change-profile-image',uploadProfileImages, verifyJWT, changeProfileImage);
router.delete('/:userId/interested/:houseId',verifyJWT, removeFav);
router.delete('/delete-account', verifyJWT, flagDeleteAccount);
router.patch('/hide-user/:id', verifyJWT, checkRole(['admin', 'moderator']), hideUser);
router.patch('/suspend/:userId' , verifyJWT, checkRole(['admin', 'moderator']), suspendUser);

export default router;