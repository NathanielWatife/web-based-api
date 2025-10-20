const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    if (error.name === 'MongoParseError') {
      console.error('Please check your MONGODB_URI format');
    } else if (error.name === 'MongoNetworkError') {
      console.error('Please make sure MongoDB is running');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;