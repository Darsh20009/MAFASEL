const Notification = require('./notification.model');
const User = require('../users/user.model');

function pushToUser(io, connectedUsers, userId, data) {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId) {
    io.to(`user_${userId}`).emit('notification', data);
  }
}

async function fireNotify(app, userId, title, body, opts = {}) {
  try {
    const notification = await Notification.create({
      userId,
      type: opts.type || 'info',
      title,
      body,
      link: opts.link || '',
      icon: opts.icon || ''
    });

    const io = app.locals.io;
    const connectedUsers = app.locals.connectedUsers;

    pushToUser(io, connectedUsers, userId, {
      type: 'notification',
      id: notification._id,
      notifType: opts.type || 'info',
      title,
      body,
      link: opts.link || ''
    });

    return notification;
  } catch (err) {
    console.error('Notification error:', err);
  }
}

async function fireNotifyAdmins(app, title, body, opts = {}) {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'moderator'] } });
    for (const admin of admins) {
      await fireNotify(app, admin._id, title, body, opts);
    }
  } catch (err) {
    console.error('Admin notification error:', err);
  }
}

module.exports = { fireNotify, fireNotifyAdmins, pushToUser };
