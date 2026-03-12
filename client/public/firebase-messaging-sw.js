// Service Worker for Firebase Cloud Messaging
// This file must be in the public directory to be accessible

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase in the service worker
// Note: This uses environment variables that are injected at build time
// For development, you may need to hardcode values or use a different approach

const firebaseConfig = {
  apiKey: 'AIzaSyBIY6tK_nEsNGa-a3JobeB9N2r5JTQiI38',
  authDomain: 'faithguard-14f7c.firebaseapp.com',
  projectId: 'faithguard-14f7c',
  storageBucket: 'faithguard-14f7c.firebasestorage.app',
  messagingSenderId: '833233062108',
  appId: '1:833233062108:web:9821a3065ea8cd729e4c19',
}

firebase.initializeApp(firebaseConfig)

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'FaithGuard'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/vite.svg', // You can customize this icon
    badge: '/vite.svg',
    tag: payload.data?.itemId || 'default', // Prevent duplicate notifications
    data: payload.data || {},
    requireInteraction: false,
    silent: false,
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.')

  event.notification.close()

  // Extract data from notification
  const data = event.notification.data || {}
  const foundItemId = data.foundItemId
  const itemId = data.itemId

  // Open the app and navigate to the relevant item
  let urlToOpen = '/home'
  if (foundItemId) {
    urlToOpen = `/found-item/${foundItemId}`
  } else if (itemId) {
    urlToOpen = `/item/${itemId}`
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
