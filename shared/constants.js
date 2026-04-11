const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  PHARMACIST: 'pharmacist',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  INSURANCE_AGENT: 'insurance_agent'
};

const CONSULTATION_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const SPECIALTIES = [
  'طب عام', 'طب أسنان', 'طب عيون', 'طب أطفال',
  'طب نساء وولادة', 'جراحة عامة', 'طب عظام',
  'طب القلب', 'طب الجلدية', 'طب نفسي', 'طب باطني'
];

const COLORS = {
  PRIMARY: '#101d23',
  SECONDARY: '#12a99b',
  WHITE: '#FFFFFF'
};

module.exports = {
  ROLES,
  CONSULTATION_STATUS,
  ORDER_STATUS,
  SPECIALTIES,
  COLORS
};
