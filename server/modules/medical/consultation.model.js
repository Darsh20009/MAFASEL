const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  attachments: [String],
  createdAt: { type: Date, default: Date.now }
});

const consultationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  specialty: { type: String, required: true },
  symptoms: { type: String, required: true },
  status: { type: String, enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  price: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'insurance', 'card', 'apple_pay', 'health_card'], default: 'cash' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  insuranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance' },
  insuranceDiscount: { type: Number, default: 0 },
  diagnosis: { type: String },
  prescription: { type: String },
  messages: [messageSchema],
  rating: { type: Number, min: 1, max: 5 },
  attachments: [String]
}, { timestamps: true });

module.exports = mongoose.models.Consultation || mongoose.model('Consultation', consultationSchema);
