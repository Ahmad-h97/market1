const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const cors = require('cors');

dotenv.config();
connectDB(); // <-- connect to MongoDB

const app = express();
app.use(express.json());
app.use(cors());


app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);

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
│ ├── controllers/userController 
│ ├── routes/ userRroutes
│ ├── models/ house , user 


│ ├── config/db.js 
│ ├── .env
│ ├── server.js
*/