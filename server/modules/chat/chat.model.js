const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  attachments: [{ url: String, name: String, type: String }],
  read: { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });

chatMessageSchema.index({ room: 1, createdAt: -1 });

const chatRoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['direct', 'consultation', 'support'], default: 'direct' },
  relatedTo: { type: mongoose.Schema.Types.ObjectId },
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = { ChatMessage, ChatRoom };
