// SentVoc Advanced Offline Engine v6.0
const CACHE_NAME = 'sentvoc-cache-v6.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

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

// নেটওয়ার্ক ফার্স্ট এবং ক্যাশ ফলব্যাক স্ট্র্যাটেজি
self.addEventListener('fetch', (e) => {
  // অনলাইন ডিকশনারি রিকোয়েস্ট সরাসরি স্কিপ করা হলো (এটি অফলাইনে কাজ করবে না)
  if (e.request.url.includes('translate.googleapis.com')) {
    return; 
  }
  
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // নেটওয়ার্ক ঠিক থাকলে ফাইলটি ক্যাশে আপডেট করে নেবে
        if (response && response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
        }
        return response;
      })
      .catch(() => {
        // ইন্টারনেট অফ থাকলে সরাসরি লোকাল ক্যাশ মেমোরি থেকে ইনস্ট্যান্ট রান করবে
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
