/* eslint-disable no-restricted-globals */
self.addEventListener('push', function (event) {
  var payload = {
    title: 'Thai Ja World',
    body: '',
    url: '/',
    tag: 'tj-daily',
  };
  try {
    if (event.data) {
      var j = event.data.json();
      if (j.title) payload.title = j.title;
      if (j.body) payload.body = j.body;
      if (j.url) payload.url = j.url;
      if (j.tag) payload.tag = j.tag;
    }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url },
      icon: '/favicon.ico',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  var abs =
    url.indexOf('http') === 0 ? url : self.location.origin + (url.indexOf('/') === 0 ? url : '/' + url);
  event.waitUntil(
    self.clients.openWindow ? self.clients.openWindow(abs) : Promise.resolve(),
  );
});
