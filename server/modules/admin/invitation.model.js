const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
  token: { type: String, unique: true, default: () => crypto.randomBytes(32).toString('hex') },
  role: {
    type: String,
    enum: ['doctor', 'pharmacist', 'moderator', 'company', 'employee', 'insurance_agent', 'admin'],
    required: true
  },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  message: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'used', 'expired', 'cancelled'], default: 'pending' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  maxUses: { type: Number, default: 1 },
  useCount: { type: Number, default: 0 }
}, { timestamps: true });

invitationSchema.methods.isValid = function() {
  return this.status === 'pending' && new Date() < this.expiresAt && this.useCount < this.maxUses;
};

module.exports = mongoose.model('Invitation', invitationSchema);
