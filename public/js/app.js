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
