const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceName: { type: String, default: 'جهاز غير معروف' },
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
  browser: { type: String },
  os: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  lastUsed: { type: Date, default: Date.now },
  firstUsed: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const loginLogSchema = new mongoose.Schema({
  method: { type: String, enum: ['email', 'phone_otp', 'google', 'apple', 'nafath', 'webauthn', 'register', 'local', 'phone'], required: true },
  action: { type: String, enum: ['login', 'logout', 'register', 'failed'], default: 'login' },
  ip: { type: String },
  userAgent: { type: String },
  deviceName: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  nationalId: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'pharmacist', 'company', 'employee', 'admin', 'moderator', 'insurance_agent'],
    default: 'patient'
  },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  authProvider: { type: String, enum: ['local', 'google', 'apple', 'nafath', 'phone'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  nafathId: { type: String, unique: true, sparse: true },
  webauthnCredentials: [{
    credentialId: { type: String },
    publicKey: { type: String },
    counter: { type: Number, default: 0 },
    deviceType: { type: String },
    backedUp: { type: Boolean },
    transports: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  webauthnChallenge: { type: String },
  medicalProfile: {
    bloodType: String,
    height: Number,
    weight: Number,
    allergies: [String],
    chronicDiseases: [String],
    medications: [String],
    surgeries: [String],
    emergencyContact: { name: String, phone: String, relation: String }
  },
  companyProfile: {
    companyName: String,
    commercialRegister: String,
    sector: String,
    employeeCount: Number,
    contactPerson: String
  },
  specialty: { type: String },
  licenseNumber: { type: String },
  bio: { type: String },
  address: {
    city: String,
    district: String,
    street: String,
    zipCode: String
  },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  darkMode: { type: Boolean, default: false },
  language: { type: String, default: 'ar' },
  lastLogin: { type: Date },
  loginHistory: [loginLogSchema],
  devices: [deviceSchema]
}, { timestamps: true });

userSchema.methods.parseDevice = function(userAgentStr, ip) {
  let deviceType = 'unknown';
  let browser = 'غير معروف';
  let os = 'غير معروف';
  let deviceName = 'جهاز غير معروف';

  if (userAgentStr) {
    const ua = userAgentStr.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(ua)) deviceType = 'mobile';
    else if (/ipad|tablet/.test(ua)) deviceType = 'tablet';
    else if (/windows|macintosh|linux|cros/.test(ua)) deviceType = 'desktop';

    if (/chrome\//.test(ua) && !/edg/.test(ua)) browser = 'Chrome';
    else if (/safari\//.test(ua) && !/chrome/.test(ua)) browser = 'Safari';
    else if (/firefox\//.test(ua)) browser = 'Firefox';
    else if (/edg\//.test(ua)) browser = 'Edge';

    if (/windows/.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/.test(ua)) os = 'macOS';
    else if (/iphone|ipad/.test(ua)) os = 'iOS';
    else if (/android/.test(ua)) os = 'Android';
    else if (/linux/.test(ua)) os = 'Linux';

    deviceName = `${browser} على ${os}`;
  }

  return { deviceType, browser, os, deviceName, ip, userAgent: userAgentStr };
};

userSchema.methods.trackDevice = function(userAgentStr, ip) {
  const parsed = this.parseDevice(userAgentStr, ip);
  const existing = this.devices.find(d =>
    d.userAgent === userAgentStr && d.ip === ip
  );

  if (existing) {
    existing.lastUsed = new Date();
    existing.isActive = true;
  } else {
    this.devices.push({
      ...parsed,
      firstUsed: new Date(),
      lastUsed: new Date(),
      isActive: true
    });
    if (this.devices.length > 10) {
      this.devices = this.devices.slice(-10);
    }
  }
};

userSchema.statics.getRoleLabel = function(role) {
  const map = {
    patient: 'مستفيد',
    doctor: 'أخصائي',
    pharmacist: 'صيدلي',
    company: 'شركة',
    employee: 'موظف',
    admin: 'مدير',
    moderator: 'مشرف',
    insurance_agent: 'وكيل تأمين'
  };
  return map[role] || role;
};

module.exports = mongoose.model('User', userSchema);
