// const fs = require('fs');
// const path = require('path');
const { createLogger, format, transports } = require('winston');

// Ensure logs directory exists
// const logsDir = path.join(__dirname, '..', 'logs');
// if (!fs.existsSync(logsDir)) {
//   fs.mkdirSync(logsDir, { recursive: true });
// }

// Basic redaction utility: mask likely sensitive values
function redact(value) {
  if (!value) return value;
  // Mask long tokens/keys
  if (typeof value === 'string' && value.length > 16) {
    return value.slice(0, 4) + '...' + value.slice(-4);
  }
  return value;
}

// Custom safe serializer
function safeMeta(meta) {
  try {
    const clone = JSON.parse(JSON.stringify(meta, Object.getOwnPropertyNames(meta)));
    if (clone && clone.headers) {
      // Redact authorization and cookies
      if (clone.headers.authorization) clone.headers.authorization = '[REDACTED]';
      if (clone.headers.cookie) clone.headers.cookie = '[REDACTED]';
      if (clone.headers['set-cookie']) clone.headers['set-cookie'] = '[REDACTED]';
    }
    if (clone && clone.body) {
      // Redact common secrets
      ['password', 'pass', 'token', 'secret', 'otp', 'code'].forEach((k) => {
        if (clone.body[k] !== undefined) clone.body[k] = '[REDACTED]';
      });
    }
    return clone;
  } catch (_) {
    return meta;
  }
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: undefined,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack, ...meta }) => {
      const m = typeof message === 'string' ? message : JSON.stringify(message);
      const rest = Object.keys(meta).length ? ' ' + JSON.stringify(safeMeta(meta)) : '';
      return `${timestamp} ${level}: ${stack || m}${rest}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    // new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    // new transports.File({ filename: path.join(logsDir, 'app.log') }),
  ],
});

// Stream for morgan
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// Helper to log startup lines without leaking env values
function startup(msg) {
  logger.info(`[startup] ${msg}`);
}

module.exports = { logger, redact, startup };
