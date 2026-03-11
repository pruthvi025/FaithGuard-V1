# Admin Authentication Setup Guide

This guide explains how to set up Firebase Authentication for the FaithGuard Admin Panel.

## Prerequisites

1. Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. Firebase Authentication enabled with Email/Password provider
3. Firestore Database enabled

## Step 1: Configure Firebase

1. Go to Firebase Console > Project Settings > General
2. Scroll down to "Your apps" and click the web icon (`</>`)
3. Register your app and copy the Firebase configuration
4. Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

5. Update `src/config/firebase.js` if you prefer hardcoding (not recommended for production)

## Step 2: Enable Email/Password Authentication

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Click "Save"

## Step 3: Create Admin Accounts

### Option A: Using Firestore (Recommended)

1. Go to Firebase Console > Firestore Database
2. Create a collection named `admins`
3. For each admin, create a document with:
   - Document ID: The Firebase Auth User UID (after creating the user)
   - Fields:
     - `role`: "admin" (string)
     - `active`: true (boolean)
     - `email`: admin email (string)
     - `createdAt`: timestamp

4. Create the Firebase Auth user:
   - Go to Authentication > Users
   - Click "Add user"
   - Enter email and password
   - Copy the User UID
   - Go back to Firestore and create the admin document with that UID

### Option B: Using Custom Claims (Requires Firebase Admin SDK)

If you have a backend server with Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');

// Set custom claim
admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

Then update `AdminAuthContext.jsx` to check custom claims instead of Firestore.

## Step 4: Test Admin Login

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Navigate to `/admin/login`
4. Enter admin credentials
5. You should be redirected to `/admin` dashboard

## Security Notes

- Admin accounts are pre-created manually - no public sign-up
- All admin routes are protected by `ProtectedAdminRoute`
- Non-admin users are automatically signed out if they somehow authenticate
- Admin sessions are separate from user sessions
- Admin never sees user personal information (privacy-first design)

## Troubleshooting

### "Unauthorized: This account does not have admin access"
- Verify the user exists in Firestore `admins` collection
- Check that `role` field is set to "admin"
- Check that `active` field is set to `true`
- Verify the document ID matches the Firebase Auth User UID

### Firebase configuration errors
- Ensure all environment variables are set correctly
- Check that Firebase project has Authentication and Firestore enabled
- Verify API keys are correct in `.env` file

### Login not working
- Check browser console for errors
- Verify Email/Password provider is enabled in Firebase Console
- Ensure user account exists in Firebase Authentication
