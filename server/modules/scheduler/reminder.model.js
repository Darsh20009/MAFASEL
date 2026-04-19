const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  drug: { type: String, required: true, trim: true },
  dosage: { type: String, default: '' },
  times: [{ type: String, required: true }],
  days: {
    type: [String],
    enum: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'],
    default: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  history: [{
    date: { type: Date },
    time: { type: String },
    taken: { type: Boolean, default: false }
  }]
}, { timestamps: true });

reminderSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
