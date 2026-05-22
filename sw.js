// SentVoc Advanced Offline Engine v4.9.1
const CACHE_NAME = 'sentvoc-cache-v4.9.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com' // এটি এখন নেটওয়ার্ক ফার্স্ট মেথডে অফলাইনে ক্যাশ হবে
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

// নেটওয়ার্ক ফার্স্ট এবং ক্যাশ ফলব্যাক স্ট্র্যাটেজি (ডিজাইন ও অফলাইন সেফটি নিশ্চিত করার জন্য)
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('translate.googleapis.com')) {
    return; // অনলাইন ডিকশনারি রিকোয়েস্ট স্কিপ করা হলো
  }
  
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // নেটওয়ার্ক ঠিক থাকলে ফাইলটি ক্যাশে আপডেট করে নেবে
        if (response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
        }
        return response;
      })
      .catch(() => {
        // ইন্টারনেট অফ থাকলে সরাসরি ক্যাশ মেমোরি থেকে সুন্দর ডিজাইন ফাইলটি রান করবে
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
