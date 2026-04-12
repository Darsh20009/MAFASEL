self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  var data = { title: 'مفاصل', body: 'لديك إشعار جديد', icon: '/icons/logo.png' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body || '',
    icon: data.icon || '/icons/logo.png',
    badge: data.badge || '/icons/logo.png',
    tag: data.tag || 'mafasel-notif',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'تجاهل' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'مفاصل', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  var url = '/notifications';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes(self.location.origin)) {
          clients[i].navigate(url);
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
