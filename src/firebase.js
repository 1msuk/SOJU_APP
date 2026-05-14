import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  off,
  remove,
  onDisconnect,
  serverTimestamp as rtServerTimestamp,
} from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCu0IO7Wis_iPdGulEjOIlRfBsdGi3j6h4",
  authDomain: "soju-app.firebaseapp.com",
  databaseURL: "https://soju-app-default-rtdb.firebaseio.com",
  projectId: "soju-app",
  storageBucket: "soju-app.firebasestorage.app",
  messagingSenderId: "1029912143477",
  appId: "1:1029912143477:web:a9300857d3a364030dba3c",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

export const signInAnon = () => signInAnonymously(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);
export const getCurrentUser = () => auth.currentUser;

export const subscribeBars = (callback) => {
  const q = query(collection(db, "bars"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const bars = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(bars);
  });
};

export const addBar = (barData) =>
  addDoc(collection(db, "bars"), {
    ...barData,
    reviews: [],
    createdAt: serverTimestamp(),
  });

export const addReview = (barId, review) =>
  updateDoc(doc(db, "bars", barId), {
    reviews: arrayUnion({
      ...review,
      id:   Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
    }),
  });

export const joinQueue = (uid, profile) => {
  const userRef = ref(rtdb, `waitingQueue/${uid}`);
  onDisconnect(userRef).remove();
  return set(userRef, {
    uid,
    ...profile,
    joinedAt: rtServerTimestamp(),
  });
};

export const leaveQueue = (uid) =>
  remove(ref(rtdb, `waitingQueue/${uid}`));

export const subscribeQueue = (callback) => {
  const qRef = ref(rtdb, "waitingQueue");
  onValue(qRef, (snap) => {
    const users = [];
    snap.forEach((child) => users.push(child.val()));
    callback(users);
  });
  return () => off(qRef);
};

export const createRoom = (uid1, uid2) => {
  const roomId = [uid1, uid2].sort().join("_");
  set(ref(rtdb, `chatRooms/${roomId}/users`), { [uid1]: true, [uid2]: true });
  onDisconnect(ref(rtdb, `chatRooms/${roomId}/users/${uid1}`)).remove();
  return roomId;
};

export const sendMessage = (roomId, uid, text) => {
  const msgRef = push(ref(rtdb, `chatRooms/${roomId}/messages`));
  return set(msgRef, {
    uid,
    text,
    sentAt: rtServerTimestamp(),
  });
};

export const subscribeMessages = (roomId, callback) => {
  const msgRef = ref(rtdb, `chatRooms/${roomId}/messages`);
  onValue(msgRef, (snap) => {
    const msgs = [];
    snap.forEach((child) => msgs.push({ id: child.key, ...child.val() }));
    callback(msgs);
  });
  return () => off(msgRef);
};

export const leaveRoom = (roomId, uid) =>
  remove(ref(rtdb, `chatRooms/${roomId}/users/${uid}`));

export const onPartnerLeave = (roomId, myUid, callback) => {
  const usersRef = ref(rtdb, `chatRooms/${roomId}/users`);
  onValue(usersRef, (snap) => {
    const users = snap.val() || {};
    if (!Object.keys(users).some((uid) => uid !== myUid)) {
      callback();
    }
  });
  return () => off(usersRef);
};