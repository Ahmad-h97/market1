const express = require('express');
const router = express.Router();
const { getAllHouses,getHouseDetails, editHouse, deleteHouse, upsertReview ,deleteReview } = require('../controllers/houseController');
const uploadMultiple = require('../middleware/upload');

router.get('/houses', getAllHouses);
router.get('/houses/:id', getHouseDetails);
router.patch('/houses/:houseId', uploadMultiple, editHouse);
router.delete('/houses/:houseId', deleteHouse);
router.put('/:houseId/reviews/:userId', upsertReview);  
router.delete('/:houseId/reviews/:userId', deleteReview);

module.exports = router;
