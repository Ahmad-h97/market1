import express from 'express';
import { 
  getAllHouses, getHouseDetails, editHouse, deleteHouse, upsertReview, deleteReview 
} from '../controllers/houseController.js';
import uploadMultiple from '../middleware/upload.js';

const router = express.Router();

router.get('/houses', getAllHouses);
router.get('/houses/:id', getHouseDetails);
router.patch('/houses/:houseId', uploadMultiple, editHouse);
router.delete('/houses/:houseId', deleteHouse);
router.put('/:houseId/reviews/:userId', upsertReview);  
router.delete('/:houseId/reviews/:userId', deleteReview);

export default router;  // ES Modules default export