// ============================================================
//  AuthPage.jsx  —  로그인 / 회원가입 화면
//  지원: 구글 로그인, 이메일+비밀번호 로그인, 이메일+비밀번호 회원가입
// ============================================================

import { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "./firebase";

// ── 공통 인풋 스타일 ─────────────────────────────────────────
const inputStyle = {
  width: "100%",
  background: "#0e0e1c",
  border: "1px solid #2a2a40",
  borderRadius: 10,
  color: "#f0f0ff",
  fontSize: 14,
  padding: "11px 14px",
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  marginBottom: 12,
};

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function AuthPage() {
  // "login" 또는 "signup" 모드 전환
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // ── 이메일 로그인 / 회원가입 처리 ──────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      // 성공 시 App.jsx의 onAuthChange가 자동으로 상태를 업데이트
    } catch (e) {
      // Firebase 오류 메시지를 한국어로 변환
      const msg = {
        "auth/user-not-found":   "존재하지 않는 계정이에요.",
        "auth/wrong-password":   "비밀번호가 틀렸어요.",
        "auth/email-already-in-use": "이미 사용 중인 이메일이에요.",
        "auth/weak-password":    "비밀번호는 6자리 이상이어야 해요.",
        "auth/invalid-email":    "올바른 이메일 형식이 아니에요.",
        "auth/invalid-credential": "이메일 또는 비밀번호가 틀렸어요.",
      }[e.code] || "오류가 발생했어요. 다시 시도해주세요.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── 구글 로그인 처리 ────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setError("구글 로그인에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "#09090f",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 앱 로고 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🍶</div>
        <h1 style={{
          margin: 0,
          fontFamily: "'Nanum Myeongjo',serif",
          fontSize: 28,
          color: "#f0f0ff",
        }}>맛집술집</h1>
        <p style={{ margin: "6px 0 0", color: "#555575", fontSize: 13 }}>
          전국 술집 탐방 & 술친구 찾기
        </p>
      </div>

      {/* 로그인 카드 */}
      <div style={{
        width: "100%",
        maxWidth: 380,
        background: "#111120",
        border: "1px solid #1e1e32",
        borderRadius: 20,
        padding: 24,
      }}>
        {/* 로그인 / 회원가입 탭 */}
        <div style={{
          display: "flex",
          background: "#0e0e1c",
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
        }}>
          {[["login","로그인"],["signup","회원가입"]].map(([key, label]) => (
            <button key={key} onClick={() => { setMode(key); setError(""); }} style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              borderRadius: 8,
              background: mode === key ? "linear-gradient(135deg,#F5A623,#e89018)" : "transparent",
              color: mode === key ? "#0a0a14" : "#555575",
              fontWeight: mode === key ? 700 : 400,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {/* 구글 로그인 버튼 */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%",
          padding: "12px 0",
          background: "#1a1a2e",
          border: "1px solid #2a2a40",
          borderRadius: 12,
          color: "#f0f0ff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          {/* 구글 로고 SVG */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.2 0 19.2-7.2 19.2-20 0-1.3-.1-2.7-.6-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.7 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.9 6l6.2 5.2C41.4 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          구글 계정으로 {mode === "login" ? "로그인" : "회원가입"}
        </button>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#1e1e32" }} />
          <span style={{ color: "#444460", fontSize: 12 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: "#1e1e32" }} />
        </div>

        {/* 이메일 입력 */}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일"
          style={inputStyle}
        />

        {/* 비밀번호 입력 */}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호 (6자리 이상)"
          onKeyDown={e => e.key === "Enter" && handleEmailAuth()}
          style={{ ...inputStyle, marginBottom: 0 }}
        />

        {/* 오류 메시지 */}
        {error && (
          <p style={{ color: "#ff6666", fontSize: 13, margin: "8px 0 0" }}>{error}</p>
        )}

        {/* 로그인 / 회원가입 버튼 */}
        <button onClick={handleEmailAuth} disabled={loading} style={{
          width: "100%",
          padding: "13px 0",
          marginTop: 14,
          background: "linear-gradient(135deg,#F5A623,#e89018)",
          border: "none",
          borderRadius: 12,
          color: "#0a0a14",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          fontFamily: "'Nanum Myeongjo',serif",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </div>

      {/* 하단 안내 */}
      <p style={{ color: "#333350", fontSize: 12, marginTop: 20, textAlign: "center" }}>
        로그인하면 술집 등록 및 리뷰 작성이 가능해요
      </p>
    </div>
  );
}
