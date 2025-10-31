const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  matricNo: {
    type: String,
    required: [true, 'Matriculation number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]\/[A-Z]{2}\/\d{2}\/\d+$/, 'Please enter a valid matriculation number']
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
    minlength: 6,
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  faculty: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  programme: {
    type: String,
    enum: ['National Diploma', 'Higher National Diploma'],
    default: 'National Diploma'
  },
  // Explicit student level used for recommendations
  level: {
    type: String,
    enum: ['ND1', 'ND2', 'HND1', 'HND2'],
    required: false
  },
  admissionYear: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);