const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  qmeetId: { type: String },
  roomName: { type: String, required: true },
  joinCode: { type: String },
  meetingLink: { type: String },
  joinUrl: { type: String },
  title: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  status: { type: String, enum: ['scheduled', 'active', 'ended', 'cancelled'], default: 'scheduled' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  notes: { type: String },
  cancelledAt: { type: Date }
}, { timestamps: true });

meetingSchema.index({ createdBy: 1, scheduledAt: -1 });
meetingSchema.index({ patient: 1, scheduledAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
