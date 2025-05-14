import express from 'express';
import  verifyJWT  from '../middleware/verifyJWT.js';
import { markFav, removeFav } from '../controllers/userController.js';

const router = express.Router();  // Define the router here



router.post('/:userId/interested/:houseId',verifyJWT, markFav);
router.delete('/:userId/interested/:houseId',verifyJWT, removeFav);

export default router;