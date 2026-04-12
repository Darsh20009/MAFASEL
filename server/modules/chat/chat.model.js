const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String },
    type: { type: String },
    size: { type: Number }
  }],
  read: { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });

chatMessageSchema.index({ room: 1, createdAt: -1 });

const internalNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const chatRoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['doctor', 'support', 'internal', 'consultation'], default: 'support' },
  relatedTo: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String, default: '' },
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  unreadCount: { type: Map, of: Number, default: {} },
  isActive: { type: Boolean, default: true },
  closedAt: { type: Date },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  internalNotes: [internalNoteSchema],
  priority: { type: String, enum: ['normal', 'medium', 'high', 'urgent'], default: 'normal' }
}, { timestamps: true });

chatRoomSchema.index({ participants: 1, isActive: 1, lastMessageAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = { ChatMessage, ChatRoom };
