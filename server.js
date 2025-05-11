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

├── market/  
│ ├── controllers/userController , houseController
│ ├── routes/ userRroutes , houseroutes, authroutes
│ ├── models/ house , user 
│ ├── middleware/upload.js,verifyjwt
│ ├── config/db.js , cloudinry.js ,jwt.config
│ ├── .env
│ ├── env.js
│ ├── server.js
│ ├── .gitignore
*/