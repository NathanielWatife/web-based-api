const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const bootstrapAdmin = require('./config/bootstrapAdmin');
const errorHandler = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Start application: connect to DB, then configure and start the server
(async function start() {
  try {
    // Connect to database (await to ensure DB is ready before bootstrapping)
    await connectDB();

    const app = express();

    const path = require('path');

    // Enhanced CORS configuration
    const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove any undefined values

    // Allow any origin only in non-production environments
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

    // Apply CORS middleware
    app.use(cors(corsOptions));

    // Handle preflight requests explicitly
    app.options(/.*/, cors(corsOptions));

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve uploaded files (development fallback for image uploads)
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Logging middleware
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      console.log('Origin:', req.headers.origin);
      next();
    });

    // Routes
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/books', require('./routes/bookRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/payments', require('./routes/paymentRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));

    // Home route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'YabaTech BookStore API is running!',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // Health check route
    app.get('/health', (req, res) => {
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      res.status(200).json({
        status: 'OK',
        environment: process.env.NODE_ENV,
        database: dbStatus,
        timestamp: new Date().toISOString(),
        cors: {
          allowedOrigins: [process.env.FRONTEND_URL].filter(Boolean)
        }
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    // Handle undefined routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
      });
    });

    const PORT = process.env.PORT;

    const server = app.listen(PORT, async () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} mode on port ${PORT}`);
      console.log(`📚 YabaTech BookStore API: ${process.env.FRONTEND_URL}`);
      console.log(`❤️  Health check: ${process.env.FRONTEND_URL}/health`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`);
      
      // Check payment gateway configuration
      if (!process.env.PAYSTACK_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY) {
        console.log('⚠️  Payment gateways not configured - using mock payments for development');
      }

      // Bootstrap admin account if missing
      await bootstrapAdmin();
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.log('Unhandled Rejection at:', promise, 'reason:', err);
      // Close server & exit process
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.log('Uncaught Exception thrown:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
})();