function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.error = 'يجب تسجيل الدخول أولاً';
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'moderator')) {
    return next();
  }
  req.session.error = 'غير مصرح لك بالوصول';
  res.redirect('/dashboard');
}

function isDoctor(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'doctor') {
    return next();
  }
  req.session.error = 'هذه الصفحة للأطباء فقط';
  res.redirect('/dashboard');
}

module.exports = { isAuthenticated, isAdmin, isDoctor };
