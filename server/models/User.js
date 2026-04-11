const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'pharmacist', 'admin', 'moderator', 'insurance_agent'], default: 'patient' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
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
  devices: [{
    userAgent: String,
    ip: String,
    lastUsed: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
