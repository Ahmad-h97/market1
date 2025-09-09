
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import houseRoutes from './routes/houseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';

import { initSocketServer } from './socket.js';
import "./jobs/scheduler.js";


dotenv.config();

const app = express();
const server = http.createServer(app); // create raw server

const io = initSocketServer(server);


// --- CORS Setup ---
const allowedOrigins = [
  'https://syrian-market-frontend1.vercel.app',
  'http://localhost:5173', // your frontend during development
  'https://your-production-frontend.com' // your deployed frontend
];

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});



app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Needed if you're using cookies, sessions, or auth headers
}));


app.use(express.json());

app.use(cookieParser());

app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/auth', authRoutes);



connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
  

server.listen(PORT, '0.0.0.0', () => {
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
├── services/
│   └── emailServices.js
│   
│
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