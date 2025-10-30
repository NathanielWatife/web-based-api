const mongoose = require('mongoose');

const connectDB = async () => {
  try {    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    const { logger } = require('../utils/logger');
    logger.info('MongoDB connected');
    return conn;
  } catch (error) {
    const { logger } = require('../utils/logger');
    logger.error('Database connection error: ' + error.message);
    
    if (error.name === 'MongoParseError') {
      logger.error('Please check your MONGO_URI format');
    } else if (error.name === 'MongoNetworkError') {
      logger.error('Please make sure MongoDB is running');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;