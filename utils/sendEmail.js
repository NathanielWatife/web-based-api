const nodemailer = require('nodemailer');
const { logger, redact } = require('./logger');

const sendEmail = async (options) => {
  logger.info(`Email send attempt`, { 
    to: options.email ? options.email.replace(/(.{2}).+(@.*)/, '$1***$2') : undefined 
  });

  // Development fallback - log code instead of sending email
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    logger.info('DEVELOPMENT: Email would be sent with code', { 
      code: options.html.match(/\d{6}/)?.[0] || 'code not found',
      subject: options.subject
    });
    return { skipped: true, message: 'Email logged instead of sent (development)' };
  }

  // Production: Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.warn('Email credentials missing. Logging instead of sending.');
    logger.info('EMAIL CONTENT:', { 
      subject: options.subject,
      code: options.html.match(/\d{6}/)?.[0] || 'code not found',
      to: options.email
    });
    return { skipped: true, message: 'Email credentials not configured' };
  }

  // Derive secure flag (true for port 465 or explicit)
  const derivedSecure = process.env.EMAIL_SECURE
    ? String(process.env.EMAIL_SECURE).toLowerCase() === 'true'
    : Number(process.env.EMAIL_PORT) === 465;

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || undefined,
    host: process.env.EMAIL_HOST || undefined,
    port: Number(process.env.EMAIL_PORT) || undefined,
    secure: derivedSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT) || 30000,
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT) || 30000,
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT) || 30000,
    tls: {
      rejectUnauthorized: String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true',
    },
  });

  // Choose a safe "from" address. For Gmail, force using the authenticated user to avoid rejection.
  const isGmail = (process.env.EMAIL_SERVICE || '').toLowerCase().includes('gmail')
    || (process.env.EMAIL_HOST || '').toLowerCase().includes('gmail');
  const fromAddress = isGmail
    ? `YabaTech BookStore <${process.env.EMAIL_USER}>`
    : (process.env.DEFAULT_FROM_EMAIL || `YabaTech BookStore <${process.env.EMAIL_USER}>`);

  const mailOptions = {
    from: fromAddress,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS) || 1;
  const backoffMs = Number(process.env.EMAIL_RETRY_BACKOFF_MS) || 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { 
        messageId: info.messageId,
        to: options.email.replace(/(.{2}).+(@.*)/, '$1***$2'),
        attempt
      });
      return info;
    } catch (error) {
      logger.error('Email sending failed', {
        error: error.message,
        code: error.code,
        attempt,
      });
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, backoffMs));
      } else {
        // Don't throw error - just log it so API doesn't fail
        return { error: error.message, failed: true };
      }
    }
  }
};

// Email templates
const emailTemplates = {
  passwordReset: (name, code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b826f;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Please use the code below to reset your password:</p>
      <div style="background: #f8fafc; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #3b826f; margin: 0; font-size: 2rem; letter-spacing: 5px;">${code}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <br>
      <p>Best regards,<br>YabaTech BookStore Team</p>
    </div>
  `,
  
  orderConfirmation: (name, order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b826f;">Order Confirmed!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for your order. Your order has been confirmed and is being processed.</p>
      <div style="background: #f8fafc; padding: 20px; margin: 20px 0;">
        <h3 style="color: #3b826f; margin-top: 0;">Order Details</h3>
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Total Amount:</strong> ₦${order.totalAmount.toLocaleString()}</p>
        <p><strong>Delivery Method:</strong> ${order.deliveryOption === 'pickup' ? 'Campus Pickup' : 'Home Delivery'}</p>
      </div>
      <p>We'll notify you when your order is ready for pickup or out for delivery.</p>
      <br>
      <p>Best regards,<br>YabaTech BookStore Team</p>
    </div>
  `
};

// Additional templates
emailTemplates.emailVerification = (name, code) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b826f;">Verify Your Email</h2>
    <p>Hello ${name || 'Student'},</p>
    <p>Welcome to YabaTech BookStore. Please use the 6-digit code below to verify your email address:</p>
    <div style="background: #f8fafc; padding: 20px; text-align: center; margin: 20px 0;">
      <h1 style="color: #3b826f; margin: 0; font-size: 2rem; letter-spacing: 5px;">${code}</h1>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <br>
    <p>Best regards,<br>YabaTech BookStore Team</p>
  </div>
`;

emailTemplates.orderStatusUpdate = (name, order, status) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b826f;">Order Update</h2>
    <p>Hello ${name},</p>
    <p>Your order <strong>${order.orderId}</strong> status has been updated to <strong>${status}</strong>.</p>
    <div style="background: #f8fafc; padding: 20px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Total Amount:</strong> ₦${order.totalAmount.toLocaleString()}</p>
      <p><strong>Current Status:</strong> ${status}</p>
    </div>
    <p>If you have questions, reply to this email or contact support.</p>
    <br>
    <p>Best regards,<br>YabaTech BookStore Team</p>
  </div>
`;

emailTemplates.adminNewOrder = (adminName, order, student) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b826f;">New Order Placed</h2>
    <p>Hello ${adminName || 'Admin'},</p>
    <p>A new order has been placed by <strong>${student.firstName} ${student.lastName}</strong> (${student.matricNo}).</p>
    <div style="background: #f8fafc; padding: 20px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Total Amount:</strong> ₦${order.totalAmount.toLocaleString()}</p>
      <p><strong>Items:</strong></p>
      <ul>
        ${order.items.map(i => `<li>${i.quantity} x ${i.book.title || i.book}</li>`).join('')}
      </ul>
    </div>
    <p>Visit the admin dashboard to process this order.</p>
    <br>
    <p>Best regards,<br>YabaTech BookStore System</p>
  </div>
`;

module.exports = { sendEmail, emailTemplates };
