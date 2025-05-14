import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import houseRoutes from './routes/houseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';

dotenv.config();


const app = express();
app.use(express.json());
app.use(cors());


app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/auth', authRoutes);



connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('Failed to start:', err));


/*

market/
├── controllers/
│   ├── userController.js
│   ├── houseController.js
│   ├── authController.js
│   └── verificationController.js
│
├── routes/
│   ├── userRoutes.js
│   ├── houseRoutes.js
│   └── authRoutes.js
│
├── models/
│   ├── house.js
│   ├── user.js
│   └── verification.js
│
├── middleware/
│   ├── upload.js
│   └── verifyJWT.js
│
├── config/
│   ├── db.js
│   ├── cloudinary.js
│   └── jwtConfig.js
│
├── .env
├── env.js
├── server.js
├── services.js
└── .gitignore
*/

/*

*/