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
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) { // Fixed: EMAIL_PASSWORD instead of EMAIL_PASS
    logger.warn('Email credentials missing. Logging instead of sending.');
    logger.info('EMAIL CONTENT:', { 
      subject: options.subject,
      code: options.html.match(/\d{6}/)?.[0] || 'code not found',
      to: options.email
    });
    return { skipped: true, message: 'Email credentials not configured' };
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Fixed: EMAIL_PASSWORD instead of EMAIL_PASS
    },
    connectionTimeout: 30000, // 30 seconds
    socketTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
  });

  const mailOptions = {
    from: process.env.DEFAULT_FROM_EMAIL || `YabaTech BookStore <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      messageId: info.messageId,
      to: options.email.replace(/(.{2}).+(@.*)/, '$1***$2')
    });
    return info;
  } catch (error) {
    logger.error('Email sending failed:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Don't throw error - just log it so API doesn't fail
    return { error: error.message, failed: true };
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
