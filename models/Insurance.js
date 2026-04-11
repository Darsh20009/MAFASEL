const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true },
  policyNumber: { type: String, required: true },
  type: { type: String, enum: ['basic', 'premium', 'vip'], default: 'basic' },
  status: { type: String, enum: ['active', 'pending', 'expired', 'suspended'], default: 'pending' },
  startDate: { type: Date },
  endDate: { type: Date },
  coverageAmount: { type: Number, default: 0 },
  usedAmount: { type: Number, default: 0 },
  coverageDetails: {
    consultations: { type: Boolean, default: true },
    medications: { type: Boolean, default: true },
    surgery: { type: Boolean, default: false },
    dental: { type: Boolean, default: false },
    optical: { type: Boolean, default: false }
  },
  documents: [String]
}, { timestamps: true });

module.exports = mongoose.model('Insurance', insuranceSchema);
