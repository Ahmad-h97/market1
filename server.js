const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');

dotenv.config();
connectDB(); // <-- connect to MongoDB

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
│ ├── routes/ userRroutes , houseroutes
│ ├── models/ house , user 
│ ├── middleware/upload.js
│ ├── config/db.js , cloudinry.js
│ ├── .env
│ ├── server.js
│ ├── .gitignore
*/