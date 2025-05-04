const express = require('express');
const router = express.Router();  // Define the router here
const { registerUser,loginUser,postHouse, markFav, removeFav } = require('../controllers/userController');
const uploadMultiple = require('../middleware/upload');



router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/houses', uploadMultiple, postHouse);
router.post('/:userId/interested/:houseId', markFav);
router.delete('/:userId/interested/:houseId', removeFav);

module.exports = router;