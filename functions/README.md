# Firebase Functions for UCV Energy

This folder contains a simple Cloud Function `createUserProfile` that writes a user's profile (`users/{uid}`) into Firestore using the Admin SDK. This avoids client-side Firestore write permission issues and prevents role escalation by validating `role` server-side.

How to deploy:
1. Install firebase-tools and login:

```bash
npm install -g firebase-tools
firebase login
```

2. Initialize functions in the project (one-time):

```bash
cd functions
npm install
```

3. Deploy only functions:

```bash
firebase deploy --only functions
```

Important:
- This function expects the client to call it using the Firebase SDK `httpsCallable('createUserProfile')` function, which sends auth context so the function can know the identity of the caller.
- The function validates the `role` parameter and only allows safe roles (not 'admin'). Admins should set roles server-side via custom claims or an admin-only function.
