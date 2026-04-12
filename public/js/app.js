document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  const dropdownBtn = document.querySelector('.nav-user-btn');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdownMenu.classList.remove('open'));
  }

  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', async () => {
      try {
        const res = await fetch('/profile/toggle-dark', { method: 'POST' });
        const data = await res.json();
        document.documentElement.setAttribute('data-theme', data.darkMode ? 'dark' : 'light');
      } catch(err) { console.error(err); }
    });
  }

  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    setTimeout(() => toast.remove(), 5000);
  });

  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('notification', (data) => {
      const popup = document.getElementById('notifPopup');
      const title = document.getElementById('notifPopupTitle');
      const body = document.getElementById('notifPopupBody');
      if (popup && title && body) {
        title.textContent = data.title;
        body.textContent = data.body;
        popup.style.display = 'block';
        popup.className = 'notification-popup notif-' + (data.notifType || 'info');
        setTimeout(() => { popup.style.display = 'none'; }, 5000);
        if (data.link) {
          popup.onclick = () => { window.location = data.link; };
          popup.style.cursor = 'pointer';
        }
      }
      updateNotifBadge();
    });
  }

  updateNotifBadge();
  initPushNotifications();
});

async function updateNotifBadge() {
  try {
    const res = await fetch('/notifications/unread-count');
    const data = await res.json();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (data.count > 0) {
        badge.textContent = data.count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch(err) {}
}

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    var reg = await navigator.serviceWorker.register('/sw.js');
    var sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sendSubToServer(sub);
    }
  } catch (err) {
    console.warn('SW registration failed:', err);
  }
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('متصفحك لا يدعم الإشعارات الفورية');
    return;
  }

  try {
    var permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    var keyRes = await fetch('/notifications/vapid-key');
    var keyData = await keyRes.json();
    if (!keyData.publicKey) return;

    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
    });

    await sendSubToServer(sub);

    var btn = document.getElementById('pushEnableBtn');
    if (btn) {
      btn.textContent = 'تم التفعيل';
      btn.disabled = true;
      btn.classList.add('btn-success');
    }
  } catch (err) {
    console.error('Push subscribe error:', err);
  }
}

async function sendSubToServer(sub) {
  try {
    await fetch('/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON())
    });
  } catch (err) {
    console.error('Send sub error:', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
