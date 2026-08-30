const admin = require('firebase-admin');
const { FIREBASE_SERVICE_ACCOUNT } = require('./config');

function getApp() {
  if (!admin.apps.length) {
    if (!FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
    }
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.app();
}

function db() {
  getApp();
  return admin.firestore();
}

async function getUser(userId) {
  const snap = await db().collection('users').doc(String(userId)).get();
  return snap.exists ? snap.data() : null;
}

// Creates the user only if they don't already exist. Returns { user, isNew }.
async function createUserIfNotExists(userId, { first_name, username, referrer_id }) {
  const ref = db().collection('users').doc(String(userId));
  const snap = await ref.get();
  if (snap.exists) {
    return { user: snap.data(), isNew: false };
  }

  const userData = {
    telegram_user_id: Number(userId),
    first_name: first_name || '',
    username: username || '',
    referrer_id: referrer_id ? Number(referrer_id) : null,
    referral_count: 0,
    is_verified: false,
    vip_unlocked: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(userData);
  return { user: userData, isNew: true };
}

async function setVerified(userId) {
  await db().collection('users').doc(String(userId)).update({ is_verified: true });
}

async function setVipUnlocked(userId) {
  await db().collection('users').doc(String(userId)).update({ vip_unlocked: true });
}

/**
 * Atomically registers a referral.
 * - referred_user_id is the Firestore document ID in `referrals`, which guarantees
 *   a given user can only ever be counted as a referral ONCE, for ANYONE.
 * - Self-referrals are rejected.
 * - The referrer must already exist in `users`.
 * Returns true if the referral was newly counted, false if rejected.
 */
async function registerReferral(referrerId, referredUserId) {
  if (!referrerId) return false;
  if (Number(referrerId) === Number(referredUserId)) return false;

  const database = db();
  const referralRef = database.collection('referrals').doc(String(referredUserId));
  const referrerRef = database.collection('users').doc(String(referrerId));
  const referredRef = database.collection('users').doc(String(referredUserId));

  return database.runTransaction(async (tx) => {
    const [referralSnap, referrerSnap, referredSnap] = await Promise.all([
      tx.get(referralRef),
      tx.get(referrerRef),
      tx.get(referredRef),
    ]);

    // A referral is counted only after the referred user has completed
    // the 3-channel verification step.
    if (referralSnap.exists) return false;
    if (!referrerSnap.exists || !referredSnap.exists) return false;
    if (!referrerSnap.data().is_verified) return false;
    if (!referredSnap.data().is_verified) return false;

    tx.set(referralRef, {
      referrer_id: Number(referrerId),
      referred_user_id: Number(referredUserId),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(referrerRef, {
      referral_count: admin.firestore.FieldValue.increment(1),
    });

    return true;
  });
}
module.exports = {
  getUser,
  createUserIfNotExists,
  setVerified,
  setVipUnlocked,
  registerReferral,
};
