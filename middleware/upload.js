import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'home-market', // optional folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});


const uploadMultiple = multer({ storage }).array('images', 3);

export default uploadMultiple;