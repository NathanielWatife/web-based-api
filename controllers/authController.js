const User = require('../models/User');
const Verification = require('../models/Verification');
const generateToken = require('../utils/generateToken');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const generateVerificationCode = require('../utils/generateVerificationCode');

// Verification types used in this controller: 'email-verification', 'password-reset'

// @desc    Register student
// @route   POST /api/auth/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      matricNo, 
      password, 
      phoneNumber, 
      faculty, 
      department, 
      programme, 
      admissionYear 
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { matricNo }] 
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or matric number'
      });
    }

    // Create user (email verification enabled)
    const user = await User.create({
      firstName,
      lastName,
      email,
      matricNo,
      password,
      phoneNumber,
      faculty,
      department,
      programme,
      admissionYear,
      isVerified: false
    });

    // Generate verification code and persist
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Verification.create({
      matricNo: user.matricNo,
      code: verificationCode,
      type: 'email-verification',
      expiresAt
    });

    // Respond: instruct frontend to navigate to verification UI
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the 6-digit verification code.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          matricNo: user.matricNo
        }
      }
    });

    // Send verification email asynchronously
    sendEmail({
      email: user.email,
      subject: 'Verify your email - YabaTech BookStore',
      html: emailTemplates.emailVerification(user.firstName, verificationCode)
    }).then((info) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Email verification sent:', info?.messageId || 'ok');
      }
    }).catch((err) => console.error('Failed to send verification email:', err));


  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { matricNo, password } = req.body;

    // Check if user exists and password is correct
    const user = await User.findOne({ matricNo: matricNo.toUpperCase() }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid matric number or password'
      });
    }


    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          matricNo: user.matricNo,
          role: user.role,
          faculty: user.faculty,
          department: user.department
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists and password is correct
    const user = await User.findOne({ email, role: 'admin' }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Admin login failed'
    });
  }
};


// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Verification.create({
      matricNo: user.matricNo,
      code: resetCode,
      type: 'password-reset',
      expiresAt
    });

    // Respond immediately
    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });

    // Send reset email asynchronously
    sendEmail({
      email: user.email,
      subject: 'Password Reset - YabaTech BookStore',
      html: emailTemplates.passwordReset(user.firstName, resetCode)
    })
      .then((info) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Password reset email sent:', info?.messageId || 'ok');
        }
      })
      .catch((emailError) => {
        console.error('Email sending failed:', emailError?.message || emailError);
      });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process password reset request'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token: resetCode, newPassword } = req.body;

    // Find reset record
    const reset = await Verification.findOne({
      code: resetCode,
      type: 'password-reset',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    // Update user password
    const user = await User.findOne({ matricNo: reset.matricNo }).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Mark reset as used
    reset.used = true;
    await reset.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify-token
// @access  Private
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          matricNo: user.matricNo,
          role: user.role,
          faculty: user.faculty,
          department: user.department,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// @desc    Verify email using 6-digit code
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { matricNo, verificationCode } = req.body;

    if (!matricNo || !verificationCode) {
      return res.status(400).json({ success: false, message: 'Matric number and verification code are required' });
    }

    const record = await Verification.findOne({
      matricNo: matricNo.toUpperCase(),
      code: verificationCode,
      type: 'email-verification',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Mark user as verified
    const user = await User.findOne({ matricNo: matricNo.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isVerified = true;
    await user.save();

    // Mark verification as used
    record.used = true;
    await record.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to verify email' });
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
  try {
    const { matricNo } = req.body;
    if (!matricNo) return res.status(400).json({ success: false, message: 'Matric number is required' });

    const user = await User.findOne({ matricNo: matricNo.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Verification.create({
      matricNo: user.matricNo,
      code: verificationCode,
      type: 'email-verification',
      expiresAt
    });

    // Respond immediately
    res.json({ success: true, message: 'Verification code resent to email' });

    // Send email async
    sendEmail({
      email: user.email,
      subject: 'Your verification code - YabaTech BookStore',
      html: emailTemplates.emailVerification(user.firstName, verificationCode)
    }).then((info) => {
      if (process.env.NODE_ENV !== 'production') console.log('Resend verification email sent:', info?.messageId || 'ok');
    }).catch((err) => console.error('Failed to resend verification email:', err));

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to resend verification code' });
  }
};

module.exports = {
  registerStudent,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyToken
};