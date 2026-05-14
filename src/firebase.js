// ============================================================
//  firebase.js  —  맛집술집 Firebase 설정 & 서비스 함수
// ============================================================
//
//  [사용 방법]
//  1. https://console.firebase.google.com 에서 프로젝트 생성
//  2. 웹 앱 추가 → firebaseConfig 값을 아래에 붙여넣기
//  3. Firebase Console > Firestore Database > 데이터베이스 만들기 (테스트 모드)
//  4. Firebase Console > Realtime Database > 데이터베이스 만들기 (테스트 모드)
//  5. Firebase Console > Authentication > 로그인 제공업체 > 익명 사용 설정
//
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
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

// ─────────────────────────────────────────────
//  🔥 여기에 본인의 Firebase 설정값을 넣으세요
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCu0IO7Wis_iPdGulEjOIlRfBsdGi3j6h4",
  authDomain: "soju-app.firebaseapp.com",
  databaseURL: "https://soju-app-default-rtdb.firebaseio.com",
  projectId: "soju-app",
  storageBucket: "soju-app.firebasestorage.app",
  messagingSenderId: "1029912143477",
  appId: "1:1029912143477:web:a9300857d3a364030dba3c",
};:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);   // Firestore  (술집 데이터)
const rtdb = getDatabase(app);    // Realtime DB (채팅 매칭)
const auth = getAuth(app);

// ============================================================
//  🔐 익명 로그인
// ============================================================
export const signInAnon = () => signInAnonymously(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);
export const getCurrentUser = () => auth.currentUser;

// ============================================================
//  🍶 술집 (Firestore: /bars)
// ============================================================

/** 전체 술집 실시간 구독 */
export const subscribeBars = (callback) => {
  const q = query(collection(db, "bars"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const bars = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(bars);
  });
};

/** 술집 등록 */
export const addBar = (barData) =>
  addDoc(collection(db, "bars"), {
    ...barData,
    reviews: [],
    createdAt: serverTimestamp(),
  });

/** 술집 리뷰 추가 */
export const addReview = (barId, review) =>
  updateDoc(doc(db, "bars", barId), {
    reviews: arrayUnion({
      ...review,
      id:   Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
    }),
  });

// ============================================================
//  🍻 랜덤 채팅 (Realtime Database)
//
//  구조:
//  /waitingQueue/{uid}  → 매칭 대기 중인 유저 목록
//  /chatRooms/{roomId}/messages/{msgId}  → 채팅 메시지
//  /chatRooms/{roomId}/users/{uid}       → 방 참여 유저
// ============================================================

/** 닉네임 & 성별·위치 정보로 대기열 등록 */
export const joinQueue = (uid, profile) => {
  const userRef = ref(rtdb, `waitingQueue/${uid}`);
  onDisconnect(userRef).remove(); // 연결 끊기면 자동 제거
  return set(userRef, {
    uid,
    ...profile,
    joinedAt: rtServerTimestamp(),
  });
};

/** 대기열 떠나기 */
export const leaveQueue = (uid) =>
  remove(ref(rtdb, `waitingQueue/${uid}`));

/** 대기열 실시간 구독 (매칭 로직에서 사용) */
export const subscribeQueue = (callback) => {
  const qRef = ref(rtdb, "waitingQueue");
  onValue(qRef, (snap) => {
    const users = [];
    snap.forEach((child) => users.push(child.val()));
    callback(users);
  });
  return () => off(qRef);
};

/** 채팅방 생성 */
export const createRoom = (uid1, uid2) => {
  const roomId = [uid1, uid2].sort().join("_");
  const roomRef = ref(rtdb, `chatRooms/${roomId}`);
  set(ref(rtdb, `chatRooms/${roomId}/users`), { [uid1]: true, [uid2]: true });
  onDisconnect(ref(rtdb, `chatRooms/${roomId}/users/${uid1}`)).remove();
  return roomId;
};

/** 메시지 전송 */
export const sendMessage = (roomId, uid, text) => {
  const msgRef = push(ref(rtdb, `chatRooms/${roomId}/messages`));
  return set(msgRef, {
    uid,
    text,
    sentAt: rtServerTimestamp(),
  });
};

/** 채팅 메시지 실시간 구독 */
export const subscribeMessages = (roomId, callback) => {
  const msgRef = ref(rtdb, `chatRooms/${roomId}/messages`);
  onValue(msgRef, (snap) => {
    const msgs = [];
    snap.forEach((child) => msgs.push({ id: child.key, ...child.val() }));
    callback(msgs);
  });
  return () => off(msgRef);
};

/** 채팅방 나가기 */
export const leaveRoom = (roomId, uid) =>
  remove(ref(rtdb, `chatRooms/${roomId}/users/${uid}`));

/** 상대방이 방을 떠났는지 감지 */
export const onPartnerLeave = (roomId, myUid, callback) => {
  const usersRef = ref(rtdb, `chatRooms/${roomId}/users`);
  onValue(usersRef, (snap) => {
    const users = snap.val() || {};
    if (!Object.keys(users).some((uid) => uid !== myUid)) {
      callback(); // 상대방 없음 → 콜백 호출
    }
  });
  return () => off(usersRef);
};
