const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // For cloud environments, use service-based configuration
  const service = process.env.EMAIL_SERVICE; // 'gmail'
  const port = Number(process.env.EMAIL_PORT || 587); // Use 587 for better compatibility
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  
  // Use STARTTLS (port 587) instead of SSL (port 465) for better cloud compatibility
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    service: service, // Use service name directly
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Simpler configuration for cloud environments
    pool: true,
    maxConnections: 2, // Reduced for cloud environments
    maxMessages: 100,
    // Shorter timeouts for cloud environments
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // More permissive TLS settings for cloud
    tls: {
      rejectUnauthorized: false, // Set to false for cloud environments
    },
    debug: process.env.NODE_ENV === 'development',
  });

  const from = process.env.DEFAULT_FROM_EMAIL
    ? process.env.DEFAULT_FROM_EMAIL
    : `YabaTech BookStore <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS || 3);
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempting to send email (attempt ${attempt})...`);
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (err) {
      lastError = err;
      console.error(`Email attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxAttempts) {
        const backoffMs = 2000 * attempt; // 2s, 4s
        console.log(`Retrying in ${backoffMs}ms...`);
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }
    }
  }
  
  console.error('All email attempts failed');
  throw lastError;
};

// Email templates
const emailTemplates = {
  verification: (name, code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b826f;">Welcome to YabaTech BookStore!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with YabaTech BookStore. Please use the verification code below to verify your email address:</p>
      <div style="background: #f8fafc; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #3b826f; margin: 0; font-size: 2rem; letter-spacing: 5px;">${code}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <br>
      <p>Best regards,<br>YabaTech BookStore Team</p>
    </div>
  `,
  
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

module.exports = { sendEmail, emailTemplates };