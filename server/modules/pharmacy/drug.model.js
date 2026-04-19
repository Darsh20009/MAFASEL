const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  name: { type: String, required: true, trim: true },
  nameEn: { type: String, trim: true },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['مسكنات', 'مضادات حيوية', 'فيتامينات', 'معدة', 'سكري', 'ضغط', 'حساسية', 'كوليسترول', 'جلدية', 'عيون', 'أطفال', 'مكملات', 'أخرى'],
    default: 'أخرى'
  },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  insurancePrice: { type: Number },
  insuranceSupported: { type: Boolean, default: false },
  prescription: { type: Boolean, default: false },
  stock: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
  dosage: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  barcode: { type: String },
  soldCount: { type: Number, default: 0 }
}, { timestamps: true });

drugSchema.index({ pharmacyId: 1, isActive: 1, category: 1 });
drugSchema.index({ name: 'text', nameEn: 'text', description: 'text' });

module.exports = mongoose.model('Drug', drugSchema);
