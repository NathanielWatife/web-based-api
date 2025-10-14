const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { sendEmail } = require('../config/email');
const { verificationEmailTemplate, passwordResetTemplate } = require('../utils/emailTemplates');
const { generateRandomToken, generateResetToken, formatResponse } = require('../utils/helpers');
const crypto = require('crypto');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { matricNo, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { matricNo }]
    });

    if (existingUser) {
      return res.status(400).json(
        formatResponse(false, 'User with this email or matric number already exists')
      );
    }

    // Generate email verification token
    const emailVerificationToken = generateRandomToken();

    // Create user
    const user = await User.create({
      matricNo,
      email,
      password,
      fullName,
      emailVerificationToken
    });

    // Generate JWT token
    const token = generateToken(user._id);

    // Send verification email
    const emailResult = await sendEmail({
      email: user.email,
      subject: 'Verify Your Email - YabaTech Bookstore',
      html: verificationEmailTemplate(emailVerificationToken, user.fullName)
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    res.status(201).json(
      formatResponse(true, 'Registration successful. Please check your email for verification.', {
        user: {
          _id: user._id,
          matricNo: user.matricNo,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        token,
        emailSent: emailResult.success
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Verify user email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token
    });

    if (!user) {
      return res.status(400).json(
        formatResponse(false, 'Invalid or expired verification token')
      );
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json(
      formatResponse(true, 'Email verified successfully. You can now login.')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json(
        formatResponse(false, 'Invalid email or password')
      );
    }

    // Check if password matches
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json(
        formatResponse(false, 'Invalid email or password')
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json(
        formatResponse(false, 'Please verify your email address before logging in')
      );
    }

    // Generate token using the improved function
    const token = generateToken(user._id);

    res.json(
      formatResponse(true, 'Login successful', {
        user: {
          _id: user._id,
          matricNo: user.matricNo,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        token
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json(
      formatResponse(true, 'User retrieved successfully', {
        user: {
          _id: user._id,
          matricNo: user.matricNo,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User with this email does not exist')
      );
    }

    // Generate reset token
    const { resetToken, resetPasswordExpire } = generateResetToken();

    // Save reset token to user
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save();

    // Send password reset email
    const emailResult = await sendEmail({
      email: user.email,
      subject: 'Password Reset Request - YabaTech Bookstore',
      html: passwordResetTemplate(resetToken, user.fullName)
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    res.json(
      formatResponse(true, 'Password reset email sent successfully', {
        emailSent: emailResult.success
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Hash the token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json(
        formatResponse(false, 'Invalid or expired reset token')
      );
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json(
      formatResponse(true, 'Password reset successfully. You can now login with your new password.')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User not found')
      );
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json(
          formatResponse(false, 'Email already exists')
        );
      }
      user.email = email;
      user.isEmailVerified = false; // Require email verification again
    }

    if (fullName) {
      user.fullName = fullName;
    }

    await user.save();

    res.json(
      formatResponse(true, 'Profile updated successfully', {
        user: {
          _id: user._id,
          matricNo: user.matricNo,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User with this email does not exist')
      );
    }

    if (user.isEmailVerified) {
      return res.status(400).json(
        formatResponse(false, 'Email is already verified')
      );
    }

    // Generate new verification token
    const emailVerificationToken = generateRandomToken();
    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    const emailResult = await sendEmail({
      email: user.email,
      subject: 'Verify Your Email - YabaTech Bookstore',
      html: verificationEmailTemplate(emailVerificationToken, user.fullName)
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    res.json(
      formatResponse(true, 'Verification email sent successfully', {
        emailSent: emailResult.success
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  resendVerification
};