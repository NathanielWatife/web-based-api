const verificationEmailTemplate = (verificationToken, fullName) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>YabaTech Bookstore</h1>
        </div>
        <div class="content">
          <h2>Email Verification</h2>
          <p>Hello ${fullName},</p>
          <p>Welcome to YabaTech Bookstore! Please verify your email address to complete your registration.</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} YabaTech Bookstore. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const orderConfirmationTemplate = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .order-item { border-bottom: 1px solid #ddd; padding: 10px 0; }
        .total { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.fullName},</h2>
          <p>Thank you for your order! Your order has been received and is being processed.</p>
          
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Pickup Location:</strong> ${order.pickupOption}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          
          <h3>Order Items:</h3>
          ${order.items.map(item => `
            <div class="order-item">
              <p><strong>${item.book?.title || 'Book'}</strong></p>
              <p>Quantity: ${item.quantity} | Price: ₦${item.price}</p>
            </div>
          `).join('')}
          
          <p class="total">Total Amount: ₦${order.totalAmount}</p>
          
          <p>We will notify you when your order is ready for pickup.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} YabaTech Bookstore. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const passwordResetTemplate = (resetToken, fullName) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${fullName},</h2>
          <p>You have requested to reset your password for your YabaTech Bookstore account.</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p>This password reset link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} YabaTech Bookstore. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  verificationEmailTemplate,
  orderConfirmationTemplate,
  passwordResetTemplate
};