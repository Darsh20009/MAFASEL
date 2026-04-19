const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema({
  name: { type: String, required: true },
  severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' },
  notes: String
}, { _id: true });

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  diagnosedAt: Date,
  status: { type: String, enum: ['active', 'controlled', 'resolved'], default: 'active' },
  notes: String
}, { _id: true });

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: String,
  frequency: String,
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true },
  notes: String
}, { _id: true });

const historyEntrySchema = new mongoose.Schema({
  type: { type: String, enum: ['surgery', 'hospitalization', 'injury', 'other'], default: 'other' },
  title: { type: String, required: true },
  date: Date,
  facility: String,
  notes: String
}, { _id: true });

const medicalProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
  height: Number,
  weight: Number,
  smokingStatus: { type: String, enum: ['never', 'former', 'current', ''], default: '' },
  alcoholStatus: { type: String, enum: ['never', 'occasional', 'regular', ''], default: '' },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  allergies: [allergySchema],
  chronicDiseases: [diseaseSchema],
  medications: [medicationSchema],
  history: [historyEntrySchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MedicalProfile', medicalProfileSchema);
