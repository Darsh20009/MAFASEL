const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  metadata: {
    intent: { type: String },
    department: { type: String },
    confidence: { type: Number },
    suggestions: [String],
    referralSpecialty: { type: String },
    escalated: { type: Boolean, default: false }
  },
  persona: {
    name: { type: String },
    title: { type: String },
    avatar: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
});

const aiConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'محادثة جديدة' },
  type: {
    type: String,
    enum: ['medical', 'support', 'insurance', 'pharmacy', 'general', 'complaint'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'escalated', 'closed'],
    default: 'active'
  },
  assignedPersona: {
    name: { type: String },
    title: { type: String },
    avatar: { type: String },
    department: { type: String }
  },
  messages: [aiMessageSchema],
  escalation: {
    department: { type: String },
    reason: { type: String },
    referredTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
    escalatedAt: { type: Date }
  },
  context: {
    symptoms: [String],
    analyzedSpecialty: { type: String },
    urgencyLevel: { type: String, enum: ['low', 'medium', 'high', 'emergency'], default: 'low' }
  },
  report: {
    generated: { type: Boolean, default: false },
    content: { type: String },
    generatedAt: { type: Date },
    type: { type: String, enum: ['medical', 'support', 'general'] }
  },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

aiConversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
