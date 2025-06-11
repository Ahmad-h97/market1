import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import partialHouseData from '../middleware/auth.js';
 import optionalAuth from '../middleware/optionalAuth.js'
import { 
  getAllHouses,getUserHouses, getHouseDetails,postHouse, editHouse, deleteHouse, upsertReview, deleteReview 
} from '../controllers/houseController.js';
import uploadMultiple from '../middleware/upload.js';

const router = express.Router();

router.post('/houses',verifyJWT, uploadMultiple, postHouse);
router.get('/houses',optionalAuth, partialHouseData, getAllHouses);
router.get('/userHouses',verifyJWT, partialHouseData, getUserHouses);
router.get('/houses/:houseId',optionalAuth, partialHouseData, getHouseDetails);
router.patch('/houses/:houseId',verifyJWT, uploadMultiple, editHouse);
router.delete('/houses/:houseId',verifyJWT, deleteHouse);
router.put('/:houseId/reviews/:userId',verifyJWT, upsertReview);  
router.delete('/:houseId/reviews/:userId',verifyJWT, deleteReview);

export default router;  // ES Modules default export