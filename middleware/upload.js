const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'home-market', // optional folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});


const uploadMultiple = multer({ storage }).array('images', 3);

module.exports = uploadMultiple;