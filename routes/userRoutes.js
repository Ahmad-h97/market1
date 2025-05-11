import express from 'express';
import { postHouse, markFav, removeFav } from '../controllers/userController.js';
import uploadMultiple from '../middleware/upload.js';

const router = express.Router();  // Define the router here


router.post('/houses', uploadMultiple, postHouse);
router.post('/:userId/interested/:houseId', markFav);
router.delete('/:userId/interested/:houseId', removeFav);

export default router;