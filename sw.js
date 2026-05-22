// SentVoc Service Worker - v4.9 Offline Cache
const CACHE_NAME = 'sentvoc-cache-v1';
const ASSETS = [
  './',
  './index.html', // যদি আপনার মূল ফাইলের নাম অন্য কিছু হয়, তবে এখানে সেটি লিখবেন
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

// ইনস্টল এবং ক্যাশ ফাইল রাইট করা
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// পুরনো ক্যাশ ডিলিট করা
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// অফলাইন রিকোয়েস্ট হ্যান্ডলিং (Cache First approach)
self.addEventListener('fetch', (e) => {
  // গুগল ট্রান্সলেট বা এক্সটার্নাল এপিআই রিকোয়েস্ট ক্যাশ করবে না
  if (e.request.url.includes('translate.googleapis.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
