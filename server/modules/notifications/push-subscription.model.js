const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

pushSubscriptionSchema.index({ userId: 1, active: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
