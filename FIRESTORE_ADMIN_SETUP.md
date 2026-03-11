# Firestore Admin Collection Setup

## Collection Structure

Create a collection in Firestore named: `admins`

## Document Structure

Each admin document should have the following structure:

### Document ID
- Use the Firebase Authentication User UID as the document ID

### Document Fields

```json
{
  "role": "admin",
  "active": true,
  "email": "admin@temple.org",
  "createdAt": "2024-01-01T00:00:00Z",
  "name": "Admin Name" // Optional
}
```

## Step-by-Step Setup

1. **Create Firebase Auth User**
   - Go to Firebase Console > Authentication > Users
   - Click "Add user"
   - Enter email: `admin@temple.org`
   - Enter password (temporary, user should change on first login)
   - Click "Add user"
   - **Copy the User UID** (you'll need this for the next step)

2. **Create Firestore Admin Document**
   - Go to Firebase Console > Firestore Database
   - Click "Start collection" (if collection doesn't exist)
   - Collection ID: `admins`
   - Document ID: Paste the User UID from step 1
   - Add fields:
     - `role` (string): `admin`
     - `active` (boolean): `true`
     - `email` (string): `admin@temple.org`
     - `createdAt` (timestamp): Current timestamp
   - Click "Save"

3. **Test Login**
   - Navigate to `/admin/login` in your app
   - Enter the email and password from step 1
   - You should be redirected to the admin dashboard

## Multiple Admins

Repeat steps 1-2 for each additional admin account.

## Deactivating an Admin

To deactivate an admin without deleting their account:
- Open the admin document in Firestore
- Set `active` field to `false`
- The admin will be automatically logged out and unable to log in

## Security Rules (Optional but Recommended)

Add Firestore security rules to protect the `admins` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated admins can read the admins collection
    match /admins/{adminId} {
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
      allow write: if false; // Only allow writes via Admin SDK
    }
  }
}
```

Note: This requires Firebase Admin SDK for creating/updating admin documents.
