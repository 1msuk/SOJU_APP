// ============================================================
//  App.jsx  —  맛집술집 진입점 (전체 앱 조립)
// ============================================================
//
//  폴더 구조:
//  src/
//  ├── App.jsx          ← 이 파일
//  ├── firebase.js
//  ├── BarsPage.jsx
//  └── ChatPage.jsx
//
//  설치:
//  npm create vite@latest matjib-suljip -- --template react
//  cd matjib-suljip
//  npm install firebase
//  (src/ 안에 위 4개 파일 넣기)
//  npm run dev
//
// ============================================================

import { useState, useEffect } from "react";
import { signInAnon, onAuthChange } from "./firebase";
import BarsPage from "./BarsPage";
import ChatPage from "./ChatPage";

const TABS = [
  { key: "bars", icon: "🍶", label: "술집" },
  { key: "chat", icon: "🍻", label: "같이 마셔요" },
];

export default function App() {
  const [tab, setTab]     = useState("bars");
  const [uid, setUid]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase 익명 로그인 (앱 시작 시 자동)
  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        setUid(user.uid);
        setLoading(false);
      } else {
        try {
          await signInAnon();
        } catch (e) {
          console.error("로그인 실패:", e);
          setLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{
        background:"#09090f", minHeight:"100vh",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        color:"#f0f0ff", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}>
        <div style={{ fontSize:52, marginBottom:16, animation:"pulse 1s infinite" }}>🍶</div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        <p style={{ margin:0, fontFamily:"'Nanum Myeongjo',serif", fontSize:20, color:"#F5A623" }}>맛집술집</p>
        <p style={{ margin:"8px 0 0", color:"#555575", fontSize:13 }}>잠시만요...</p>
      </div>
    );
  }

  return (
    <div style={{
      background:"#09090f",
      minHeight:"100vh",
      color:"#f0f0ff",
      fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      maxWidth:430,
      margin:"0 auto",
      position:"relative",
    }}>
      {/* 주변광 효과 */}
      <div style={{
        position:"fixed", top:-120, left:"30%",
        width:300, height:300,
        background:"radial-gradient(circle,rgba(245,166,35,0.05) 0%,transparent 70%)",
        pointerEvents:"none", zIndex:0,
      }} />

      {/* 헤더 */}
      <div style={{
        padding:"48px 20px 14px",
        position:"sticky", top:0,
        background:"linear-gradient(to bottom,#09090f 80%,transparent)",
        zIndex:20,
      }}>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:10, color:"#F5A623", letterSpacing:3, marginBottom:2, fontWeight:700 }}>🍶 MATJIB SULJIP</div>
            <h1 style={{ margin:0, fontFamily:"'Nanum Myeongjo',serif", fontSize:26, fontWeight:700, color:"#f0f0ff" }}>맛집술집</h1>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ padding:"0 20px 110px", position:"relative", zIndex:1 }}>
        {tab === "bars" && <BarsPage myUid={uid} />}
        {tab === "chat" && <ChatPage myUid={uid} />}
      </div>

      {/* 하단 탭바 */}
      <div style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:430,
        background:"linear-gradient(to top,#09090f 70%,transparent)",
        padding:"8px 20px 28px", zIndex:30,
      }}>
        <div style={{
          background:"#111120", border:"1px solid #1e1e32",
          borderRadius:18, padding:"6px", display:"flex",
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1, padding:"10px 0", border:"none",
              background: tab===t.key ? "linear-gradient(135deg,#F5A623,#e89018)":"transparent",
              color: tab===t.key ? "#0a0a14":"#555575",
              borderRadius:12, cursor:"pointer",
              fontSize:13, fontWeight: tab===t.key?700:400,
              fontFamily:"inherit", transition:"all 0.2s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
