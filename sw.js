const CACHE_NAME = 'sentvoc-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png' // আপনার আইকন ফাইলের নাম নিশ্চিত করুন
];

// সার্ভিস ওয়ার্কার ইনস্টল করা এবং ফাইল ক্যাশ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// নেটওয়ার্ক রিকোয়েস্ট হ্যান্ডেল করা (অফলাইনেও যাতে অ্যাপ চলে)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
