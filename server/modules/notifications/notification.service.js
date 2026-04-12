const Notification = require('./notification.model');
const User = require('../users/user.model');
const PushSubscription = require('./push-subscription.model');

let webpush = null;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@mafasel.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (e) {
  console.warn('web-push not available');
}

function pushToUser(io, connectedUsers, userId, data) {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId) {
    io.to(`user_${userId}`).emit('notification', data);
  }
}

async function sendWebPush(userId, payload) {
  if (!webpush || !process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = await PushSubscription.find({ userId, active: true });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
        }, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.findByIdAndUpdate(sub._id, { active: false });
        }
      }
    }
  } catch (err) {
    console.error('Web push error:', err.message);
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
      icon: opts.icon || '',
      priority: opts.priority || 'normal'
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

    sendWebPush(userId, {
      title,
      body,
      icon: '/icons/logo.png',
      badge: '/icons/logo.png',
      tag: notification._id.toString(),
      data: { url: opts.link || '/notifications' }
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

module.exports = { fireNotify, fireNotifyAdmins, pushToUser, sendWebPush };
