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

const upload = multer({ storage });

const uploadMultiple = upload.array('images', 3);

module.exports = upload;

module.exports = uploadMultiple;