const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  matricNo: {
    type: String,
    required: [true, 'Matric number is required'],
    unique: true,
    trim: true,
    match: [/^[fpFP]\/(hd|HD|nd|ND)\/\d{2}\/\d{7}$/i, 'Please enter a valid matric number format (e.g., F/HD/23/3210015 or p/nd/23/3210015)']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Convert matricNo to uppercase before saving (optional)
userSchema.pre('save', function(next) {
  if (this.matricNo && this.isModified('matricNo')) {
    this.matricNo = this.matricNo.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);