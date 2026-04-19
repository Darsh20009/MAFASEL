const mongoose = require('mongoose');

const medicalLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['consultation', 'ai', 'doctor', 'profile_update', 'lab', 'prescription'], required: true },
  title: String,
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

medicalLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MedicalLog', medicalLogSchema);
