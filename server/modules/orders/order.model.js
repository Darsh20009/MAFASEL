const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  drugId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drug' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  insurancePrice: { type: Number },
  prescription: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
  pharmacy: { type: String, default: 'صيدلية مفاصل' },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'insurance', 'card'], default: 'cash' },
  insuranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance' },
  insuranceDiscount: { type: Number, default: 0 },
  address: { type: String },
  notes: { type: String },
  prescriptionImage: { type: String },
  deliveryFee: { type: Number, default: 0 },
  deliveryDate: { type: Date },
  trackingNumber: { type: String }
}, { timestamps: true });

orderSchema.index({ patient: 1, createdAt: -1 });
orderSchema.index({ pharmacyId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
