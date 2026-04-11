const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['success', 'info', 'warning', 'error'], default: 'info' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  link: { type: String, default: '' },
  icon: { type: String, default: '' },
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
