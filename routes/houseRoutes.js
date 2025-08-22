import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import partialHouseData from '../middleware/auth.js';
 import optionalAuth from '../middleware/optionalAuth.js'
import { 
  getAllHouses,getMyHouses, getHouseDetails,postHouse,hideHouse, editHouse, deleteHouse, upsertReview, deleteReview ,getUserHouses,toggleOutOfStock
} from '../controllers/houseController.js';
import { uploadMultiple } from '../middleware/upload.js';
import { checkRole } from '../middleware/checkRole.js';
import checkSuspended from '../middleware/checkSuspended.js';

const router = express.Router();

router.post('/houses',verifyJWT,checkSuspended, uploadMultiple, postHouse);
router.get('/houses',optionalAuth, partialHouseData, getAllHouses);
router.get('/userHouses',verifyJWT, partialHouseData, getMyHouses);
router.get('/:userId/houses',optionalAuth,partialHouseData, getUserHouses);
router.get('/houses/:houseId',optionalAuth, partialHouseData, getHouseDetails);
router.patch('/houses/:houseId',verifyJWT, uploadMultiple,checkRole('admin'), editHouse);
router.delete('/houses/:houseId',verifyJWT,checkRole('admin'), deleteHouse);
router.put('/:houseId/reviews/:userId',verifyJWT,checkSuspended,  upsertReview);  
router.delete('/:houseId/reviews/:userId',verifyJWT, deleteReview);
router.patch('/houses/:houseId/toggle-stock',verifyJWT, toggleOutOfStock);
router.patch('/hide-house/:id', verifyJWT, checkRole(['admin', 'moderator']), hideHouse);


export default router;  // ES Modules default export