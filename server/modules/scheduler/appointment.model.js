const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String, default: '' },
  specialty: { type: String, default: '' },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 30 },
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'missed'], default: 'scheduled' },
  reminders: [{
    type: { type: String, enum: ['15min', '30min', '1hour', '1day'], default: '1hour' },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date }
  }],
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }
}, { timestamps: true });

appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
