const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameEn: { type: String, trim: true },
  logo: { type: String, default: '' },
  cover: { type: String, default: '' },
  description: { type: String, default: '' },
  location: {
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number }
  },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  workingHours: { type: String, default: '8:00 ص - 12:00 م' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  rating: { type: Number, default: 5, min: 0, max: 5 },
  totalOrders: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  freeDeliveryAbove: { type: Number, default: 0 },
  insuranceSupported: { type: Boolean, default: false },
  supportedInsuranceCompanies: [String],
  licenseNumber: { type: String, default: '' }
}, { timestamps: true });

pharmacySchema.index({ isActive: 1, isFeatured: -1 });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
