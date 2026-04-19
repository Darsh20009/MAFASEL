const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const specialistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true },
  title: { type: String, default: 'أخصائي علاج طبيعي' },
  specializations: [String],
  experience: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  licenseNumber: { type: String, default: '' },
  center: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  centerName: { type: String, default: '' },
  city: { type: String, default: '' },
  availability: {
    saturday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '16:00' } },
    sunday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '16:00' } },
    monday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '16:00' } },
    tuesday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '16:00' } },
    wednesday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '16:00' } },
    thursday: { available: { type: Boolean, default: true }, from: { type: String, default: '08:00' }, to: { type: String, default: '14:00' } },
    friday: { available: { type: Boolean, default: false }, from: { type: String, default: '' }, to: { type: String, default: '' } }
  },
  consultationFee: { type: Number, default: 0 },
  sessionFee: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  reviews: [reviewSchema],
  acceptsOnline: { type: Boolean, default: true },
  acceptsHomeVisit: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

specialistSchema.index({ city: 1 });
specialistSchema.index({ specializations: 1 });
specialistSchema.index({ rating: -1 });
specialistSchema.index({ isActive: 1 });

module.exports = mongoose.model('Specialist', specialistSchema);
