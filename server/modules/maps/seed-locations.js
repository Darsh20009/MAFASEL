const mongoose = require('mongoose');
const Location = require('./location.model');

const seedLocations = [
  { name: 'مركز مفاصل للعلاج الطبيعي - العليا', type: 'physiotherapy_center', lat: 24.6689, lng: 46.6806, address: 'الزهراء، طريق مكة المكرمة', city: 'الرياض', phone: '0114647272', workingHours: '8:00 ص - 10:00 م', image: '/uploads/centers/physio-center-1.jpg', description: 'مركز متخصص في العلاج الطبيعي والتأهيل الحركي بأحدث الأجهزة والمعدات', rating: 4.9 },
  { name: 'مركز الحركة للتأهيل الطبي', type: 'physiotherapy_center', lat: 24.7232, lng: 46.6235, address: 'الدرعية', city: 'الرياض', phone: '0114670011', workingHours: '8:00 ص - 9:00 م', image: '/uploads/centers/physio-center-2.jpg', description: 'مركز تأهيل طبي شامل للإصابات الرياضية والعمليات الجراحية', rating: 4.7 },
  { name: 'مركز التعافي للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.6388, lng: 46.8363, address: 'السليمانية', city: 'الرياض', phone: '0112889999', workingHours: '9:00 ص - 10:00 م', image: '/uploads/centers/physio-center-3.jpg', description: 'مركز علاج طبيعي متكامل مع خدمات العلاج المائي والكهربائي', rating: 4.6 },
  { name: 'مركز الشفاء للتأهيل والعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.7438, lng: 46.6523, address: 'العليا، طريق الملك فهد', city: 'الرياض', phone: '0114908000', workingHours: '8:00 ص - 11:00 م', image: '/uploads/centers/physio-center-4.jpg', description: 'مركز تأهيل شامل متخصص في إصابات العمود الفقري والمفاصل', rating: 4.8 },
  { name: 'مركز الأمل للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.7110, lng: 46.6742, address: 'حي الملز', city: 'الرياض', phone: '0112750000', workingHours: '9:00 ص - 9:00 م', image: '/uploads/centers/physio-center-1.jpg', description: 'علاج طبيعي متخصص للحالات العصبية والأطفال', rating: 4.5 },
  { name: 'مركز مفاصل للعلاج الطبيعي - الخبر', type: 'physiotherapy_center', lat: 26.3630, lng: 50.1156, address: 'حي الخبر الشمالية', city: 'الخبر', phone: '0138966666', workingHours: '8:00 ص - 10:00 م', image: '/uploads/centers/physio-center-2.jpg', description: 'فرع مفاصل في الخبر — خدمات علاج طبيعي متكاملة', rating: 4.9 },
  { name: 'مركز الرعاية للتأهيل - مكة', type: 'physiotherapy_center', lat: 21.4225, lng: 39.8262, address: 'الزاهر', city: 'مكة المكرمة', phone: '0125566911', workingHours: '8:00 ص - 10:00 م', image: '/uploads/centers/physio-center-3.jpg', description: 'مركز تأهيل طبي بمكة المكرمة بأحدث التقنيات العلاجية', rating: 4.7 },
  { name: 'مركز النهضة للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.4672, lng: 39.6024, address: 'العزيزية', city: 'المدينة المنورة', phone: '0148271111', workingHours: '9:00 ص - 9:00 م', image: '/uploads/centers/physio-center-4.jpg', description: 'علاج طبيعي احترافي في قلب المدينة المنورة', rating: 4.6 },
  { name: 'مركز العناية للتأهيل - جدة', type: 'physiotherapy_center', lat: 21.5425, lng: 39.1727, address: 'حي الروضة', city: 'جدة', phone: '0126775555', workingHours: '8:00 ص - 11:00 م', image: '/uploads/centers/physio-center-1.jpg', description: 'مركز تأهيل شامل في جدة مع فريق من أمهر المعالجين', rating: 4.8 },
  { name: 'مركز مفاصل للعلاج الطبيعي - جدة', type: 'physiotherapy_center', lat: 21.5169, lng: 39.2192, address: 'الحمراء', city: 'جدة', phone: '0126677777', workingHours: '8:00 ص - 10:00 م', image: '/uploads/centers/physio-center-2.jpg', description: 'فرع مفاصل في جدة — كل خدمات العلاج الطبيعي تحت سقف واحد', rating: 4.9 },
  { name: 'صيدلية النهدي - العليا', type: 'pharmacy', lat: 24.6936, lng: 46.6853, address: 'شارع العليا', city: 'الرياض', phone: '920004007', workingHours: '8:00 ص - 12:00 م', image: '/uploads/pharmacy/covers/nahdi-cover.jpg' },
  { name: 'صيدلية الدواء - الملز', type: 'pharmacy', lat: 24.6553, lng: 46.7131, address: 'حي الملز', city: 'الرياض', phone: '920008889', workingHours: '8:00 ص - 11:00 م', image: '/uploads/pharmacy/covers/aldawaa-cover.jpg' },
  { name: 'صيدلية النهدي - الخبر', type: 'pharmacy', lat: 26.2785, lng: 50.2085, address: 'شارع الأمير تركي', city: 'الخبر', phone: '920004007', workingHours: '8:00 ص - 12:00 م', image: '/uploads/pharmacy/covers/nahdi-cover.jpg' },
  { name: 'صيدلية الدواء - جدة', type: 'pharmacy', lat: 21.4858, lng: 39.1925, address: 'شارع فلسطين', city: 'جدة', phone: '920008889', workingHours: '8:00 ص - 11:00 م', image: '/uploads/pharmacy/covers/aldawaa-cover.jpg' },
  { name: 'صيدلية المتحدة - السلامة', type: 'pharmacy', lat: 21.5556, lng: 39.1815, address: 'حي السلامة', city: 'جدة', phone: '0122345678', workingHours: '9:00 ص - 10:00 م', image: '/uploads/pharmacy/covers/lemon-cover.jpg' },
  { name: 'صيدلية كيور - النسيم', type: 'pharmacy', lat: 24.6820, lng: 46.7880, address: 'حي النسيم', city: 'الرياض', phone: '0114556677', workingHours: '24 ساعة', image: '/uploads/pharmacy/covers/orange-cover.jpg' },
  { name: 'صيدلية الحياة - الدمام', type: 'pharmacy', lat: 26.4207, lng: 50.0888, address: 'شارع الأمير محمد', city: 'الدمام', phone: '0138811234', workingHours: '8:00 ص - 11:00 م', image: '/uploads/pharmacy/covers/nahdi-cover.jpg' },
  { name: 'مركز البدن للعلاج الطبيعي - الدمام', type: 'physiotherapy_center', lat: 26.4340, lng: 50.1033, address: 'حي الأمير محمد بن فهد', city: 'الدمام', phone: '0138271555', workingHours: '8:00 ص - 10:00 م', image: '/uploads/centers/physio-center-3.jpg', description: 'مركز تأهيل طبي متكامل في الدمام للإصابات الرياضية والجراحية', rating: 4.7 },
];

async function seed() {
  const count = await Location.countDocuments();
  if (count === 0) {
    await Location.insertMany(seedLocations);
    console.log('Seeded ' + seedLocations.length + ' locations');
  }
}

module.exports = seed;
