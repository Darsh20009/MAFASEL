function formatDate(date) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(date) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function generateTrackingNumber(prefix = 'MF') {
  return prefix + '-' + Date.now().toString(36).toUpperCase();
}

function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

module.exports = {
  formatDate,
  formatDateTime,
  generateTrackingNumber,
  truncate
};
