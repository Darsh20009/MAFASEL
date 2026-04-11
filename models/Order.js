const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  prescription: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacy: { type: String, default: 'صيدلية مفاصل' },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'], default: 'pending' },
  address: { type: String },
  notes: { type: String },
  prescriptionImage: { type: String },
  deliveryDate: { type: Date },
  trackingNumber: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
