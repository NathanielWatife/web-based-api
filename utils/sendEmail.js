const nodemailer = require('nodemailer');
let sgMail = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (_) {
  // optional dependency
}

const sendEmail = async (options) => {
  // If SendGrid API key is present, use HTTPS-based sending (more reliable on serverless hosts)
  if (process.env.SENDGRID_API_KEY && sgMail) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_USER;
      const msg = {
        to: options.email,
        from,
        subject: options.subject,
        html: options.html,
      };
      const [resp] = await sgMail.send(msg);
      return { messageId: resp?.headers?.['x-message-id'] || resp?.headers?.['x-message-id'] };
    } catch (err) {
      console.error('SendGrid send failed:', err?.message || err);
      // fall through to SMTP fallback
    }
  }

  // Prefer explicit host/port for reliability on hosting providers
  const service = process.env.EMAIL_SERVICE; // e.g., 'gmail'
  const port = Number(process.env.EMAIL_PORT || (service === 'gmail' ? 465 : 587));
  const host = process.env.EMAIL_HOST || (service === 'gmail' ? 'smtp.gmail.com' : undefined);
  const secure = port === 465; // true for 465, false for 587 (STARTTLS)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Connection pool to improve stability and avoid repeated handshakes
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    // Timeouts to avoid hanging sockets
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 20000),
    tls: {
      // Enforce modern TLS without disabling verification
      ciphers: 'TLSv1.2',
      rejectUnauthorized: true,
    },
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

  // Simple retry to mitigate transient timeouts
  const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS || 2);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (err) {
      lastError = err;
      const code = err && (err.code || err.responseCode);
      console.error(`Email attempt ${attempt} failed${code ? ` (${code})` : ''}:`, err.message || err);
      if (attempt < maxAttempts) {
        // small backoff
        await new Promise((res) => setTimeout(res, 1000 * attempt));
        continue;
      }
    }
  }
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