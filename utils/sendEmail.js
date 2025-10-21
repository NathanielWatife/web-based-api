const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Use direct Gmail configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Optimized for cloud environments
    connectionTimeout: 60000, // Increased to 60 seconds
    greetingTimeout: 30000,   // Increased to 30 seconds
    socketTimeout: 60000,     // Increased to 60 seconds
    // Important: Disable TLS certificate verification for cloud
    tls: {
      rejectUnauthorized: false
    },
    // Enable debug logging
    debug: true,
    logger: true
  });

  const from = `YabaTech BookStore <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  console.log(`📧 Attempting to send email to: ${options.email}`);
  console.log(`📧 Using SMTP: smtp.gmail.com:587`);
  
  try {
    // First, verify the connection
    console.log('🔧 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    
    // Then send the email
    console.log('🚀 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  } finally {
    // Close the transporter
    transporter.close();
  }
};


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