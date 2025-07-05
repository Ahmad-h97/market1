import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'home-market/profile-pics',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});


const uploadMultiple = multer({ storage }).fields([
  { name: 'imagesUltra', maxCount: 3 },
  { name: 'imagesPost', maxCount: 3 },
]);
const uploadProfileImage = multer({ storage }).single('profileImage');

export { uploadMultiple, uploadProfileImage };