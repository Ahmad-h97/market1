const express = require('express');
const router = express.Router();  // Define the router here

const {postHouse, markFav, removeFav } = require('../controllers/userController');
const uploadMultiple = require('../middleware/upload');



router.post('/houses', uploadMultiple, postHouse);
router.post('/:userId/interested/:houseId', markFav);
router.delete('/:userId/interested/:houseId', removeFav);

module.exports = router;