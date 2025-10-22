const nodemailer = require('nodemailer');

// Generic email sender function (Gmail SMTP via Nodemailer)
const sendEmail = async (options) => {
  console.log(`📧 Attempting to send email to: ${options.email}`);

  const service = process.env.EMAIL_SERVICE;
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = port === 465; // 465 = SSL/TLS

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password required
    },
    pool: true,
    keepAlive: true,
    maxConnections: Number(process.env.EMAIL_MAX_CONNECTIONS || 3),
    maxMessages: Number(process.env.EMAIL_MAX_MESSAGES || 200),
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 30000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 20000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 45000),
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || 'true') === 'true',
      servername: host,
    },
    logger: String(process.env.EMAIL_DEBUG || 'false') === 'true',
    debug: String(process.env.EMAIL_DEBUG || 'false') === 'true',
    name: process.env.EMAIL_EHLO_NAME || undefined,
  });

  const from = process.env.DEFAULT_FROM_EMAIL || `YabaTech BookStore <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS || 3);
  const backoffBase = Number(process.env.EMAIL_RETRY_BACKOFF_MS || 2000);

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info?.messageId || 'ok');
      return info;
    } catch (error) {
      lastError = error;
      console.error(`❌ Email attempt ${attempt} failed:`, error?.message || error);
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, backoffBase * attempt));
      }
    }
  }

  throw lastError;
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

module.exports = { sendEmail, emailTemplates };
