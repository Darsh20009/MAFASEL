const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'نظام' },
  userRole: { type: String, default: '' },
  action: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['auth', 'user', 'consultation', 'pharmacy', 'insurance', 'admin', 'chat', 'notification', 'system', 'scheduler', 'maps'],
    default: 'system'
  },
  details: { type: String, default: '' },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetType: { type: String, default: '' },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  statusCode: { type: Number, default: 200 },
  success: { type: Boolean, default: true }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ ip: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
