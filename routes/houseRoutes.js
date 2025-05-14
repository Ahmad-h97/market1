import express from 'express';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { 
  getAllHouses, getHouseDetails,postHouse, editHouse, deleteHouse, upsertReview, deleteReview 
} from '../controllers/houseController.js';
import uploadMultiple from '../middleware/upload.js';

const router = express.Router();

router.post('/houses',verifyJWT, uploadMultiple, postHouse);
router.get('/houses', getAllHouses);
router.get('/houses/:id', getHouseDetails);
router.patch('/houses/:houseId',verifyJWT, uploadMultiple, editHouse);
router.delete('/houses/:houseId',verifyJWT, deleteHouse);
router.put('/:houseId/reviews/:userId',verifyJWT, upsertReview);  
router.delete('/:houseId/reviews/:userId',verifyJWT, deleteReview);

export default router;  // ES Modules default export