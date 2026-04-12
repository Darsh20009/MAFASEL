const AuditLog = require('./audit.model');
const UAParser = require('ua-parser-js');

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip || '';
}

function parseDevice(userAgent) {
  if (!userAgent) return 'غير معروف';
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const parts = [];
    if (result.browser.name) parts.push(result.browser.name + (result.browser.version ? ' ' + result.browser.version.split('.')[0] : ''));
    if (result.os.name) parts.push(result.os.name + (result.os.version ? ' ' + result.os.version : ''));
    if (result.device.type) parts.push(result.device.type);
    return parts.join(' / ') || 'غير معروف';
  } catch (e) {
    return 'غير معروف';
  }
}

async function logAudit(options) {
  try {
    const {
      req = null,
      userId = null,
      userName = 'نظام',
      userRole = '',
      action,
      category = 'system',
      details = '',
      targetId = null,
      targetType = '',
      success = true,
      statusCode = 200
    } = options;

    const entry = {
      userId,
      userName,
      userRole,
      action,
      category,
      details,
      targetId,
      targetType,
      success,
      statusCode,
      ip: '',
      device: '',
      userAgent: '',
      method: '',
      path: ''
    };

    if (req) {
      entry.ip = getClientIp(req);
      entry.userAgent = req.headers['user-agent'] || '';
      entry.device = parseDevice(entry.userAgent);
      entry.method = req.method || '';
      entry.path = req.originalUrl || req.path || '';

      if (!userId && req.session?.user) {
        entry.userId = req.session.user._id;
        entry.userName = req.session.user.name || 'مستخدم';
        entry.userRole = req.session.user.role || '';
      }
    }

    await AuditLog.create(entry);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

function auditAction(action, category = 'system', detailsFn = null) {
  return function(req, res, next) {
    const origEnd = res.end;
    res.end = function(...args) {
      const details = detailsFn ? detailsFn(req, res) : '';
      logAudit({
        req,
        action,
        category,
        details,
        success: res.statusCode < 400,
        statusCode: res.statusCode
      });
      origEnd.apply(res, args);
    };
    next();
  };
}

module.exports = { logAudit, auditAction, getClientIp, parseDevice };
