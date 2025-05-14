import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { postHouse, markFav, removeFav } from '../controllers/userController.js';
import uploadMultiple from '../middleware/upload.js';

const router = express.Router();  // Define the router here



router.post('/:userId/interested/:houseId',verifyJWT, markFav);
router.delete('/:userId/interested/:houseId',verifyJWT, removeFav);

export default router;