const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, {
      tls: true,
      tlsAllowInvalidCertificates: true
    });
    console.log('Connected to MongoDB');

    const User = require('../server/models/User');

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'مدير النظام',
        email: 'admin@mafasel.com',
        phone: '0500000000',
        password: hash,
        role: 'admin',
        isVerified: true
      });
      console.log('Admin created: admin@mafasel.com / admin123');
    } else {
      console.log('Admin already exists');
    }

    const doctorExists = await User.findOne({ role: 'doctor' });
    if (!doctorExists) {
      const hash = await bcrypt.hash('doctor123', 10);
      await User.create({
        name: 'د. أحمد محمد',
        email: 'doctor@mafasel.com',
        phone: '0511111111',
        password: hash,
        role: 'doctor',
        specialty: 'طب عام',
        isVerified: true,
        bio: 'أخصائي علاج طبيعي بخبرة 10 سنوات'
      });
      console.log('Doctor created: doctor@mafasel.com / doctor123');
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
