const mongoose = require('mongoose');

const connectDB = async () => {
  try {    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Mongoose v6+ no longer requires these options; pass only the URI
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB Connected');
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    if (error.name === 'MongoParseError') {
      console.error('Please check your MONGO_URI format');
    } else if (error.name === 'MongoNetworkError') {
      console.error('Please make sure MongoDB is running');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;