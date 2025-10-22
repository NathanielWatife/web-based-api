const User = require('../models/User');
const Verification = require('../models/Verification');
const generateToken = require('../utils/generateToken');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const generateVerificationCode = require('../utils/generateVerificationCode');

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

    // Create user (email verification disabled)
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
      isVerified: true
    });

    // Respond: no email verification required
    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
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

module.exports = {
  registerStudent,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  verifyToken
};