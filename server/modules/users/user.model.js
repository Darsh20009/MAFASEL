const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String },
  role: { type: String, enum: ['patient', 'doctor', 'pharmacist', 'admin', 'moderator', 'insurance_agent'], default: 'patient' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  authProvider: { type: String, enum: ['local', 'google', 'apple', 'nafath', 'phone'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  nafathId: { type: String, unique: true, sparse: true },
  webauthnCredentials: [{
    credentialId: { type: String },
    publicKey: { type: String },
    counter: { type: Number, default: 0 },
    deviceType: { type: String },
    backedUp: { type: Boolean },
    transports: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  webauthnChallenge: { type: String },
  medicalProfile: {
    bloodType: String,
    allergies: [String],
    chronicDiseases: [String],
    medications: [String],
    emergencyContact: { name: String, phone: String, relation: String }
  },
  specialty: { type: String },
  licenseNumber: { type: String },
  bio: { type: String },
  darkMode: { type: Boolean, default: false },
  language: { type: String, default: 'ar' },
  lastLogin: { type: Date },
  loginHistory: [{
    method: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  devices: [{
    userAgent: String,
    ip: String,
    lastUsed: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
