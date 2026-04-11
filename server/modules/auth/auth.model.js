const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userAgent: { type: String },
  ip: { type: String },
  action: { type: String, enum: ['login', 'logout', 'register', 'otp_request', 'otp_verify', 'password_reset'], required: true },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  details: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
