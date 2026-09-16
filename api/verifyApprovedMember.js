// /api/_lib/verifyApprovedMember.js
//
// NOT used by default — this is the optional upgrade described in
// DEPLOY.md under "Locking the backend down further." Wire it into any
// /api function to require that requests come from a signed-in,
// APPROVED family member, not just anyone who found the URL.
//
// Needs:
//   1. The `firebase-admin` package (add "firebase-admin" to package.json).
//   2. A service account key: Firebase Console → Project Settings →
//      Service Accounts → Generate new private key. Downloads a JSON file.
//   3. That JSON's contents, as a single-line string, saved as the
//      Vercel environment variable FIREBASE_SERVICE_ACCOUNT_JSON.
//   4. The frontend sending the signed-in user's ID token with each
//      request — see the "Locking the backend down further" section
//      of DEPLOY.md for the two-line frontend change this needs.
//
// This checks two things: the token is a real, currently-valid Firebase
// Auth token (not forged, not expired), AND that token's uid has an
// entry in the approved_uids collection — the same collection the app
// already writes to the moment someone is approved (see registerApprovedUid
// in index.html). A stranger who never went through the app's approval
// flow has neither, so both checks fail for them.

let adminApp = null;
function getAdminApp() {
  if (adminApp) return adminApp;
  const admin = require("firebase-admin");
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return adminApp;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  const serviceAccount = JSON.parse(raw);
  adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return adminApp;
}

// Returns the verified uid on success, or throws with a message safe to
// show in a 401/403 response on failure. Call this at the top of any
// /api function you want to protect, before doing anything else:
//
//   const { verifyApprovedMember } = require("./_lib/verifyApprovedMember");
//   module.exports = async (req, res) => {
//     try {
//       await verifyApprovedMember(req);
//     } catch (err) {
//       res.status(401).json({ error: err.message });
//       return;
//     }
//     // ... rest of the handler, unchanged
//   };
async function verifyApprovedMember(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Missing Authorization header");

  const admin = require("firebase-admin");
  getAdminApp();

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (e) {
    throw new Error("Invalid or expired sign-in token");
  }

  const db = admin.firestore();
  const approvedDoc = await db.collection("approved_uids").doc(decoded.uid).get();
  if (!approvedDoc.exists) {
    throw new Error("This device isn't signed in as an approved family member");
  }

  return decoded.uid;
}

module.exports = { verifyApprovedMember };
