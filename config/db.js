const mongoose = require('mongoose');

const connectDB = async () => {
    try {        
        // Use MONGODB_URI (from your .env file) or fallback
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI) {
            throw new Error('MongoDB URI not found in environment variables. Please check your .env file');
        }

        console.log('Connecting to MongoDB...');
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB successfully');
        console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
        
    } catch (error) {
        console.error('❌ Error connecting to Database:', error.message);
        console.error('💡 Make sure:');
        console.error('   1. MongoDB is running locally (mongod service)');
        console.error('   2. Your .env file has MONGODB_URI variable');
        console.error('   3. The MongoDB connection string is correct');
        process.exit(1);
    }
};

module.exports = connectDB;