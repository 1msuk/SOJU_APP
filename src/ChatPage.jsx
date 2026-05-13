// ============================================================
//  ChatPage.jsx  —  진짜 사람 간 랜덤채팅 (Firebase Realtime DB)
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  joinQueue, leaveQueue, subscribeQueue,
  createRoom, sendMessage, subscribeMessages,
  leaveRoom, onPartnerLeave,
  getCurrentUser,
} from "./firebase";

// ── 내 프로필 설정 화면 ──────────────────────────────────────
const ProfileSetup = ({ onDone }) => {
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("선택 안 함");
  const [region, setRegion] = useState("서울");

  const REGIONS = ["서울","경기","부산","대구","인천","광주","대전","강원","기타"];

  return (
    <div style={{ paddingTop:20 }}>
      <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:22, color:"#f0f0ff", margin:"0 0 6px" }}>내 프로필 설정</h2>
      <p style={{ color:"#666680", fontSize:13, margin:"0 0 24px" }}>채팅에서 표시될 정보예요. 익명으로 사용됩니다.</p>

      <div style={{ marginBottom:16 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>닉네임</label>
        <input value={nickname} onChange={e=>setNickname(e.target.value)}
          placeholder="예: 소주러버, 맥주천사"
          maxLength={12}
          style={{ width:"100%", background:"#111120", border:"1px solid #2a2a40", borderRadius:10, color:"#f0f0ff", fontSize:14, padding:"11px 14px", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>성별 (선택)</label>
        <div style={{ display:"flex", gap:8 }}>
          {["선택 안 함","남","여"].map(g => (
            <button key={g} onClick={()=>setGender(g)} style={{
              flex:1, padding:"10px 0",
              border: gender===g ? "1px solid #F5A623":"1px solid #2a2a40",
              borderRadius:10, background: gender===g ? "#F5A62218":"#111120",
              color: gender===g ? "#F5A623":"#555575",
              cursor:"pointer", fontSize:13, fontFamily:"inherit",
              fontWeight: gender===g?700:400,
            }}>{g==="선택 안 함"?"🙂 비공개":g==="남"?"👨 남":"👩 여"}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:28 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>지역</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {REGIONS.map(r => (
            <button key={r} onClick={()=>setRegion(r)} style={{
              padding:"6px 14px",
              border: region===r ? "1px solid #F5A623":"1px solid #2a2a40",
              borderRadius:20, background: region===r ? "#F5A62218":"#111120",
              color: region===r ? "#F5A623":"#555575",
              cursor:"pointer", fontSize:12, fontFamily:"inherit",
              fontWeight: region===r?700:400,
            }}>{r}</button>
          ))}
        </div>
      </div>

      <button
        onClick={() => nickname.trim() && onDone({ nickname:nickname.trim(), gender, region })}
        disabled={!nickname.trim()}
        style={{
          width:"100%", padding:"13px 0",
          background: nickname.trim() ? "linear-gradient(135deg,#F5A623,#e89018)":"#1a1a2e",
          color: nickname.trim() ? "#0a0a14":"#444460",
          border:"none", borderRadius:12, cursor:"pointer",
          fontWeight:700, fontSize:15, fontFamily:"'Nanum Myeongjo',serif",
        }}>시작하기 🍻</button>
    </div>
  );
};

// ── 매칭 대기 화면 ───────────────────────────────────────────
const WaitingScreen = ({ profile, genderFilter, onCancel, onMatched }) => {
  const [waitCount, setWaitCount] = useState(0);
  const [dots, setDots] = useState(".");
  const uid = getCurrentUser()?.uid;

  useEffect(() => {
    // 대기열 등록
    joinQueue(uid, { ...profile, genderFilter });

    // 대기열 변화 감지 → 매칭 시도
    const unsub = subscribeQueue((users) => {
      const others = users.filter(u =>
        u.uid !== uid &&
        (genderFilter === "전체" || u.gender === genderFilter || u.gender === "선택 안 함")
      );
      setWaitCount(users.length - 1);

      if (others.length > 0) {
        // 가장 먼저 들어온 사람과 매칭
        const partner = others[0];
        const roomId = createRoom(uid, partner.uid);
        leaveQueue(uid);
        onMatched({ partner, roomId });
      }
    });

    // 점 애니메이션
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 500);

    return () => {
      unsub();
      clearInterval(interval);
      leaveQueue(uid);
    };
  }, []);

  return (
    <div style={{ textAlign:"center", paddingTop:60 }}>
      <div style={{ fontSize:56, marginBottom:20, animation:"bob 1.5s ease-in-out infinite" }}>🍺</div>
      <style>{`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", color:"#f0f0ff", margin:"0 0 8px", fontSize:22 }}>매칭 중{dots}</h2>
      <p style={{ color:"#666680", fontSize:14, margin:"0 0 6px" }}>{profile.nickname}님의 지역: {profile.region}</p>
      <p style={{ color:"#555570", fontSize:13, margin:"0 0 32px" }}>
        {waitCount > 0 ? `현재 ${waitCount}명 대기 중` : "주변에서 찾는 중이에요"}
      </p>
      <button onClick={onCancel} style={{
        background:"none", border:"1px solid #2a2a40", color:"#666680",
        borderRadius:12, padding:"10px 24px", cursor:"pointer", fontSize:13, fontFamily:"inherit",
      }}>취소</button>
    </div>
  );
};

// ── 채팅방 ────────────────────────────────────────────────────
const ChatRoom = ({ roomId, myUid, myProfile, partner, onLeave }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [partnerLeft, setPartnerLeft] = useState(false);
  const msgRef = useRef(null);

  useEffect(() => {
    const unsubMsg = subscribeMessages(roomId, setMessages);
    const unsubLeave = onPartnerLeave(roomId, myUid, () => setPartnerLeft(true));
    return () => { unsubMsg(); unsubLeave(); };
  }, [roomId]);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!input.trim() || partnerLeft) return;
    sendMessage(roomId, myUid, input.trim());
    setInput("");
  };

  const leave = () => {
    leaveRoom(roomId, myUid);
    onLeave();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 200px)" }}>
      {/* 상대 정보 */}
      <div style={{
        background:"#111120", border:"1px solid #1e1e32", borderRadius:16,
        padding:"14px 16px", marginBottom:12,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:40, height:40,
            background:"linear-gradient(135deg,#F5A623,#e89018)",
            borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
          }}>
            {partner.gender==="남"?"👨":partner.gender==="여"?"👩":"🙂"}
          </div>
          <div>
            <div style={{ color:"#f0f0ff", fontWeight:600, fontSize:14 }}>{partner.nickname}</div>
            <div style={{ color:"#666680", fontSize:12 }}>{partner.region} · {partner.gender==="선택 안 함"?"비공개":partner.gender+"성"}</div>
          </div>
        </div>
        <button onClick={leave} style={{
          background:"none", border:"1px solid #2a2a40", color:"#666680",
          borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit",
        }}>나가기</button>
      </div>

      {/* 상대방 나감 알림 */}
      {partnerLeft && (
        <div style={{ background:"#2a1a1a", border:"1px solid #aa443344", borderRadius:12, padding:"10px 14px", marginBottom:12, color:"#cc8888", fontSize:13, textAlign:"center" }}>
          상대방이 채팅을 나갔어요 😢
        </div>
      )}

      {/* 메시지 영역 */}
      <div ref={msgRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8, paddingRight:4 }}>
        {messages.map(m => {
          const isMe = m.uid === myUid;
          return (
            <div key={m.id} style={{ display:"flex", justifyContent: isMe?"flex-end":"flex-start" }}>
              <div style={{
                maxWidth:"72%", padding:"10px 14px",
                borderRadius: isMe?"16px 4px 16px 16px":"4px 16px 16px 16px",
                background: isMe?"linear-gradient(135deg,#F5A623,#e89018)":"#1a1a2e",
                color: isMe?"#0a0a14":"#d0d0e8",
                fontSize:14, lineHeight:1.5,
                border: isMe?"none":"1px solid #2a2a40",
                fontWeight: isMe?600:400,
              }}>{m.text}</div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div style={{ textAlign:"center", padding:"30px 0", color:"#444460" }}>
            <p style={{ margin:0, fontSize:14 }}>🍻 {partner.nickname}님과 연결됐어요!</p>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"#333350" }}>먼저 인사해보세요</p>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter" && send()}
          placeholder={partnerLeft?"상대방이 나갔어요":"메시지 입력..."}
          disabled={partnerLeft}
          style={{
            flex:1, background:"#111120", border:"1px solid #2a2a40",
            borderRadius:12, color:"#f0f0ff", fontSize:14,
            padding:"12px 14px", fontFamily:"inherit", outline:"none",
            opacity: partnerLeft?0.5:1,
          }}
        />
        <button onClick={send} disabled={!input.trim()||partnerLeft} style={{
          width:46, height:46, flexShrink:0,
          background: input.trim()&&!partnerLeft ? "linear-gradient(135deg,#F5A623,#e89018)":"#1a1a2e",
          border:"none", borderRadius:12, cursor:"pointer", fontSize:20,
          opacity: partnerLeft?0.4:1,
        }}>↑</button>
      </div>
    </div>
  );
};

// ── 메인 채팅 페이지 ─────────────────────────────────────────
export default function ChatPage({ myUid }) {
  const [step, setStep] = useState("profile");   // profile → filter → waiting → chat
  const [myProfile, setMyProfile] = useState(null);
  const [genderFilter, setGenderFilter] = useState("전체");
  const [matchData, setMatchData] = useState(null); // { partner, roomId }

  if (step === "profile") {
    return (
      <ProfileSetup onDone={(p) => { setMyProfile(p); setStep("filter"); }} />
    );
  }

  if (step === "filter") {
    return (
      <div style={{ paddingTop:20 }}>
        <div style={{ fontSize:52, textAlign:"center", marginBottom:20 }}>🍻</div>
        <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", color:"#f0f0ff", margin:"0 0 6px", fontSize:22, textAlign:"center" }}>같이 한잔해요</h2>
        <p style={{ color:"#666680", fontSize:14, margin:"0 0 32px", lineHeight:1.6, textAlign:"center" }}>같은 지역의 술친구를 찾아드려요</p>

        <div style={{ marginBottom:28 }}>
          <p style={{ color:"#9090b0", fontSize:13, margin:"0 0 10px" }}>누구를 만나고 싶으세요?</p>
          <div style={{ display:"flex", gap:8 }}>
            {["전체","남","여"].map(g => (
              <button key={g} onClick={()=>setGenderFilter(g)} style={{
                flex:1, padding:"11px 0",
                border: genderFilter===g ? "1px solid #F5A623":"1px solid #2a2a40",
                borderRadius:12, background: genderFilter===g ? "#F5A62218":"#111120",
                color: genderFilter===g ? "#F5A623":"#666680",
                cursor:"pointer", fontSize:14, fontFamily:"inherit",
                fontWeight: genderFilter===g?700:400,
              }}>{g==="전체"?"👥 전체":g==="남"?"👨 남성":"👩 여성"}</button>
            ))}
          </div>
        </div>

        <button onClick={()=>setStep("waiting")} style={{
          width:"100%", padding:"14px 0",
          background:"linear-gradient(135deg,#F5A623,#e89018)",
          border:"none", borderRadius:14, color:"#0a0a14",
          fontWeight:700, fontSize:16, cursor:"pointer",
          fontFamily:"'Nanum Myeongjo',serif",
          boxShadow:"0 4px 20px rgba(245,166,35,0.3)",
        }}>🎲 매칭 시작</button>

        <button onClick={()=>setStep("profile")} style={{
          width:"100%", marginTop:10, padding:"11px 0",
          background:"none", border:"1px solid #2a2a40", color:"#555575",
          borderRadius:14, cursor:"pointer", fontSize:13, fontFamily:"inherit",
        }}>프로필 수정</button>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <WaitingScreen
        profile={myProfile}
        genderFilter={genderFilter}
        onCancel={() => setStep("filter")}
        onMatched={(data) => { setMatchData(data); setStep("chat"); }}
      />
    );
  }

  if (step === "chat" && matchData) {
    return (
      <ChatRoom
        roomId={matchData.roomId}
        myUid={myUid}
        myProfile={myProfile}
        partner={matchData.partner}
        onLeave={() => { setMatchData(null); setStep("filter"); }}
      />
    );
  }

  return null;
}
