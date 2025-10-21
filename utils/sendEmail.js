const { Resend } = require('resend');

// Initialize Resend client using your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY);

// Generic email sender function
const sendEmail = async (options) => {
  console.log(`📧 Attempting to send email to: ${options.email}`);

  try {
    const data = await resend.emails.send({
      from: 'YabaTech BookStore <noreply@yabatechbookstore.com>', // change after domain verification
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    console.log('✅ Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Email templates (same as before)
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
