# Notification System Setup Guide

This document explains how to set up the Firebase Cloud Messaging (FCM) notification system for FaithGuard.

## Overview

FaithGuard uses Firebase Cloud Messaging (FCM) to send push notifications to users. Notifications are:
- **Privacy-first**: Session-bound tokens that expire with sessions
- **Context-aware**: Only sent for lost & found events
- **Temple-scoped**: Only sent to users checked into the same temple
- **Non-intrusive**: Never used for marketing or global broadcasts

## Setup Instructions

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Under **Web Push certificates**, click **Generate key pair**
5. Copy the generated **VAPID key** (starts with `BK...`)

### 2. Environment Variables

Create or update your `.env` file with the FCM VAPID key:

```env
VITE_FCM_VAPID_KEY=your-vapid-key-here
```

Also ensure your Firebase config is set up:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Service Worker Configuration

The service worker file is located at `public/firebase-messaging-sw.js`. 

**Important**: Update the Firebase config in this file to match your project:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
}
```

Alternatively, for production, you can inject these values at build time.

### 4. HTTPS Requirement

**Important**: Push notifications only work over HTTPS (or localhost for development). Ensure your production deployment uses HTTPS.

## How It Works

### Permission Flow

1. User checks into a temple
2. After check-in, user sees notification permission modal
3. User can choose to enable or skip notifications
4. If enabled, FCM token is generated and stored (session-bound)

### Token Management

- Tokens are generated only after user grants permission
- Tokens are associated with:
  - Current anonymous session ID
  - Current temple code
- Tokens expire automatically when:
  - Session expires (4 hours)
  - User logs out manually
  - App is closed (best effort)

### Notification Triggers

Notifications are sent when:
- **New lost item reported**: All checked-in users at the same temple (except reporter)
- **Item marked as found**: The original reporter
- **Case status changes**: The relevant parties (reporter/finder)
- **New message**: The other party in the conversation

### Notification Content

All notifications are privacy-safe:
- No personal identifiers
- No exact locations
- No item owner names
- Short, non-alarming messages

Examples:
- "Lost item reported nearby"
- "Someone found your item"
- "New message about your item"

## Server-Side Implementation (Production)

**Note**: The current implementation includes client-side notification triggers that emit events. For production, you should implement server-side notification sending using:

### Option 1: Firebase Cloud Functions

Create Cloud Functions that:
1. Listen to Firestore changes (item creation, status updates, messages)
2. Query active FCM tokens for the temple
3. Send notifications using Firebase Admin SDK

Example structure:
```javascript
// functions/index.js
const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

exports.onItemCreated = functions.firestore
  .document('items/{itemId}')
  .onCreate(async (snap, context) => {
    const item = snap.data()
    
    // Get active tokens for this temple
    const tokensSnapshot = await admin.firestore()
      .collection('fcm_tokens')
      .where('templeCode', '==', item.templeCode)
      .where('expiresAt', '>', new Date())
      .get()
    
    const tokens = tokensSnapshot.docs
      .map(doc => doc.data().token)
      .filter(token => token !== item.reporterSessionId) // Exclude reporter
    
    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'Lost item reported nearby',
          body: `${item.title} was reported at ${item.location}`,
        },
        data: {
          itemId: item.id,
          type: 'new-lost-item',
          templeCode: item.templeCode,
        },
        tokens: tokens,
      }
      
      await admin.messaging().sendMulticast(message)
    }
  })
```

### Option 2: Backend API

If you're using a backend API:
1. Store FCM tokens in your database (Firestore/PostgreSQL)
2. When items are created/updated, query active tokens
3. Send notifications using FCM Admin SDK or REST API

### Token Storage in Firestore

Store tokens in a `fcm_tokens` collection:

```
fcm_tokens/{sessionId}
  - token: string
  - sessionId: string
  - templeCode: string
  - createdAt: timestamp
  - expiresAt: timestamp
```

## Testing

### Local Testing

1. Run the app: `npm run dev`
2. Check in to a temple
3. Grant notification permission
4. Check browser console for FCM token
5. Use Firebase Console > Cloud Messaging > Send test message to test

### Production Testing

1. Deploy with HTTPS
2. Check in and grant permission
3. Create a test item report
4. Verify notifications are received

## Troubleshooting

### Notifications Not Working

1. **Check HTTPS**: Notifications require HTTPS (except localhost)
2. **Check VAPID key**: Ensure VAPID key is correctly set in `.env`
3. **Check service worker**: Ensure `firebase-messaging-sw.js` is accessible at `/firebase-messaging-sw.js`
4. **Check permissions**: User must grant notification permission
5. **Check browser support**: Not all browsers support push notifications

### Service Worker Not Registering

1. Check browser console for errors
2. Ensure service worker file is in `public/` directory
3. Clear browser cache and reload
4. Check service worker registration in DevTools > Application > Service Workers

### Token Not Generated

1. Check Firebase config is correct
2. Check VAPID key is set
3. Check browser console for errors
4. Verify notification permission was granted

## Privacy & Security

- Tokens are session-bound and expire automatically
- No personal information is stored with tokens
- Notifications contain no personal identifiers
- Tokens are only used for lost & found events
- No cross-temple notifications
- No notification history stored long-term

## Architecture Decisions

1. **Session-bound tokens**: Tokens expire with sessions for privacy
2. **Temple-scoped**: Only send to users at the same temple
3. **Event-driven**: Notifications only for relevant lost & found events
4. **Privacy-first**: No personal info, no tracking, no history
5. **Client-side triggers, server-side sending**: Client emits events, server sends notifications (production)

## Future Enhancements

- [ ] Implement Firebase Cloud Functions for server-side sending
- [ ] Add notification preferences (enable/disable per session)
- [ ] Add notification history (optional, session-bound)
- [ ] Add notification sound/vibration preferences
- [ ] Add batch notification sending for efficiency
