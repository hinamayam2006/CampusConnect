import dotenv from 'dotenv';
import 'dotenv/config';
dotenv.config();

import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });