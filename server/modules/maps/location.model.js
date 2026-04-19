const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['hospital', 'pharmacy', 'physiotherapy_center'], required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  workingHours: { type: String, default: '' },
  description: { type: String, default: '' },
  services: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

locationSchema.index({ type: 1 });
locationSchema.index({ city: 1 });

module.exports = mongoose.model('Location', locationSchema);
