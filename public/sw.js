var CACHE_NAME = 'mafasel-v2';
var STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/css/style.css',
  '/js/app.js',
  '/icons/logo.png',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

var OFFLINE_PAGE = '/offline';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('/admin/')) return;

  if (url.origin === self.location.origin &&
      (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') ||
       url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') ||
       url.pathname.endsWith('.gif') || url.pathname.endsWith('.svg') ||
       url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff'))) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) {
          fetch(event.request).then(function(response) {
            if (response && response.status === 200) {
              var clone = response.clone();
              caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
            }
          }).catch(function() {});
          return cached;
        }
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function() {
          return caches.match(event.request);
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function() { return cached; });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_PAGE).then(function(offlinePage) {
            return offlinePage || new Response(
              '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>غير متصل | مفاصل</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Tajawal,sans-serif;background:#101d23;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}.offline-wrap{max-width:400px}.offline-icon{font-size:4rem;margin-bottom:1.5rem;opacity:0.4}h1{font-size:1.5rem;margin-bottom:0.75rem}p{color:rgba(255,255,255,0.6);margin-bottom:1.5rem;line-height:1.6}.retry-btn{display:inline-block;padding:0.75rem 2rem;background:#12a99b;color:#fff;border:none;border-radius:12px;font-size:1rem;font-family:inherit;cursor:pointer;text-decoration:none;transition:opacity 0.2s}.retry-btn:hover{opacity:0.85}</style></head><body><div class="offline-wrap"><div class="offline-icon">📡</div><h1>أنت غير متصل بالإنترنت</h1><p>لا يمكن الوصول إلى هذه الصفحة حالياً. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.</p><a href="javascript:location.reload()" class="retry-btn">إعادة المحاولة</a></div></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        }
      });
    })
  );
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
    badge: '/icons/icon-72.png',
    tag: data.tag || 'mafasel-notif-' + Date.now(),
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

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
