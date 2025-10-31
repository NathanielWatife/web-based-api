const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const bootstrapAdmin = require('./config/bootstrapAdmin');
const errorHandler = require('./middleware/errorMiddleware');
const morgan = require('morgan');
const { logger, startup } = require('./utils/logger');

// Load env vars
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables: ' + missingEnvVars.join(', '));
  logger.error('Please check your .env file');
  process.exit(1);
}

// Connect to database and ensure admin account exists BEFORE starting server
// Avoid serverless cold start issues by awaiting initialization
const initialize = async () => {
  await connectDB();
  await bootstrapAdmin();
};

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Allow all subdomains of vercel.app for flexibility
    if (allowedOrigins.some(allowed => origin === allowed) || 
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
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

// Handle preflight requests explicitly (use RegExp to avoid path-to-regexp '*' issue)
app.options(/.*/, cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging (sanitized): avoid logging query strings or sensitive headers
morgan.token('urlPath', (req) => (req.originalUrl || req.url || '').split('?')[0]);
app.use(
  morgan(':method :urlPath :status :res[content-length] - :response-time ms', {
    stream: logger.stream,
    skip: () => process.env.NODE_ENV === 'test',
  })
);

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

const PORT = process.env.PORT || 5000;

let server;
initialize()
  .then(() => {
    server = app.listen(PORT, () => {
      startup(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      startup(`API: http://localhost:${PORT}`);
      startup(`Health check: http://localhost:${PORT}/health`);
      startup('CORS enabled');

      // Check payment gateway configuration
      if (!process.env.PAYSTACK_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY) {
        logger.warn('Payment gateways not configured - using mock payments for development');
      }
    });
  })
  .catch((err) => {
    logger.error('Server initialization failed: ' + (err?.message || err));
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection', { reason: err?.message || err, promise: typeof promise });
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown', { error: err?.message, stack: err?.stack });
  process.exit(1);
});