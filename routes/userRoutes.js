import express from 'express';
import  verifyJWT  from '../middleware/verifyJWT.js';
import { markFav, removeFav,toggleFollow} from '../controllers/userController.js';

const router = express.Router();  // Define the router here



router.post('/:userId/interested/:houseId',verifyJWT, markFav);
router.delete('/:userId/interested/:houseId',verifyJWT, removeFav);
router.post('/follow/:id', verifyJWT, toggleFollow);




export default router;