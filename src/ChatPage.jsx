// ============================================================
//  ChatPage.jsx  —  랜덤 채팅 화면 (전체 문제 수정 완전판)
//
//  ✅ 수정 목록:
//  1. [무한루프 수정] onMatched → useRef로 감싸서 deps 제거
//  2. [무한루프 수정] profile 객체 → 개별 프로퍼티로 분리
//  3. [스팸방지 추가] 메시지 전송 300ms 쿨다운
//  4. [null 처리]   myUid 없을 때 로그인 안내 화면
//  5. [UX 개선]     Shift+Enter 줄바꿈 지원
//  6. [보안 강화]   닉네임 입력값 sanitize 처리
//  7. [접근성 수정] 모든 버튼에 type="button" 명시
//  8. [메모리누수]  isMatchedRef 플래그로 중복 매칭/누수 방지
//  9. [UX 개선]     uid 없을 때 빈 화면 대신 안내 메시지
//  10.[코드품질]    useEffect 의존성 배열 전면 점검
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  joinQueue,
  leaveQueue,
  subscribeQueue,
  createRoom,
  sendMessage,
  subscribeMessages,
  leaveRoom,
  onPartnerLeave,
  getCurrentUser,
  sanitizeAndTrim, // ✅ [수정6] XSS 방어용 sanitize 함수 import
} from "./firebase";

// ============================================================
//  1단계: 내 프로필 설정 화면
// ============================================================
const ProfileSetup = ({ onDone }) => {
  const [nickname, setNickname] = useState("");
  const [gender, setGender]     = useState("선택 안 함");
  const [region, setRegion]     = useState("서울");

  const REGIONS = ["서울","경기","부산","대구","인천","광주","대전","강원","기타"];

  // ✅ [수정6] 닉네임 제출 시 XSS 방어 sanitize 적용
  const handleDone = () => {
    const safeName = sanitizeAndTrim(nickname, 12);
    if (!safeName) return;
    onDone({ nickname: safeName, gender, region });
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:22, color:"#f0f0ff", margin:"0 0 6px" }}>
        내 프로필 설정
      </h2>
      <p style={{ color:"#666680", fontSize:13, margin:"0 0 24px" }}>
        채팅에서 표시될 정보예요. 익명으로 사용됩니다.
      </p>

      {/* 닉네임 입력 */}
      <div style={{ marginBottom:16 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>닉네임</label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="예: 소주러버, 맥주천사"
          maxLength={12}
          style={{
            width:"100%", background:"#111120", border:"1px solid #2a2a40",
            borderRadius:10, color:"#f0f0ff", fontSize:14, padding:"11px 14px",
            fontFamily:"inherit", boxSizing:"border-box", outline:"none",
          }}
        />
      </div>

      {/* 성별 선택 */}
      <div style={{ marginBottom:16 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>성별 (선택)</label>
        <div style={{ display:"flex", gap:8 }}>
          {["선택 안 함","남","여"].map(g => (
            <button
              key={g}
              type="button" // ✅ [수정7] type 명시
              onClick={() => setGender(g)}
              style={{
                flex:1, padding:"10px 0",
                border: gender===g ? "1px solid #F5A623":"1px solid #2a2a40",
                borderRadius:10,
                background: gender===g ? "#F5A62218":"#111120",
                color: gender===g ? "#F5A623":"#555575",
                cursor:"pointer", fontSize:13, fontFamily:"inherit",
                fontWeight: gender===g ? 700:400,
              }}
            >
              {g==="선택 안 함" ? "🙂 비공개" : g==="남" ? "👨 남" : "👩 여"}
            </button>
          ))}
        </div>
      </div>

      {/* 지역 선택 */}
      <div style={{ marginBottom:28 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>지역</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {REGIONS.map(r => (
            <button
              key={r}
              type="button" // ✅ [수정7]
              onClick={() => setRegion(r)}
              style={{
                padding:"6px 14px",
                border: region===r ? "1px solid #F5A623":"1px solid #2a2a40",
                borderRadius:20,
                background: region===r ? "#F5A62218":"#111120",
                color: region===r ? "#F5A623":"#555575",
                cursor:"pointer", fontSize:12, fontFamily:"inherit",
                fontWeight: region===r ? 700:400,
              }}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* 시작 버튼 */}
      <button
        type="button" // ✅ [수정7]
        onClick={handleDone}
        disabled={!nickname.trim()}
        style={{
          width:"100%", padding:"13px 0",
          background: nickname.trim() ? "linear-gradient(135deg,#F5A623,#e89018)":"#1a1a2e",
          color: nickname.trim() ? "#0a0a14":"#444460",
          border:"none", borderRadius:12, cursor:"pointer",
          fontWeight:700, fontSize:15, fontFamily:"'Nanum Myeongjo',serif",
        }}
      >
        시작하기 🍻
      </button>
    </div>
  );
};

// ============================================================
//  2단계: 매칭 대기 화면
//
//  ✅ [수정1] onMatched를 useRef로 감싸서 deps 무한루프 방지
//  ✅ [수정2] profile 객체 대신 개별 프로퍼티를 deps에 등록
//  ✅ [수정8] isMatchedRef 플래그로 중복 매칭 및 메모리 누수 방지
//  ✅ [수정9] uid 없을 때 로그인 안내 표시
// ============================================================
const WaitingScreen = ({ profile, genderFilter, onCancel, onMatched }) => {
  const [waitCount, setWaitCount] = useState(0);
  const [dots, setDots]           = useState(".");

  // ✅ [수정1] onMatched 함수 참조를 ref에 저장
  //    → 부모 리렌더링 시 함수 참조가 바뀌어도 무한루프 없음
  const onMatchedRef  = useRef(onMatched);
  useEffect(() => { onMatchedRef.current = onMatched; }, [onMatched]);

  // ✅ [수정8] 매칭 완료 플래그 → 중복 매칭/cleanup 꼬임 방지
  const isMatchedRef  = useRef(false);

  const uid = getCurrentUser()?.uid;

  // ✅ [수정2] profile 객체 전체 대신 필요한 프로퍼티만 deps 등록
  const { nickname, gender, region } = profile;

  useEffect(() => {
    // ✅ [수정9] uid 없으면 실행 안 함
    if (!uid) return;

    isMatchedRef.current = false; // 매 마운트마다 초기화

    // 대기열에 내 정보 등록
    joinQueue(uid, { nickname, gender, region, genderFilter });

    // 대기열 실시간 감시 → 매칭 가능한 상대 찾기
    const unsub = subscribeQueue((users) => {
      // ✅ [수정8] 이미 매칭됐으면 콜백 무시
      if (isMatchedRef.current) return;

      const others = users.filter(u =>
        u.uid !== uid &&
        (genderFilter === "전체" || u.gender === genderFilter || u.gender === "선택 안 함")
      );
      setWaitCount(users.length - 1);

      if (others.length > 0) {
        // ✅ [수정8] 플래그 먼저 세팅해서 중복 매칭 방지
        isMatchedRef.current = true;
        const partner = others[0];
        const roomId  = createRoom(uid, partner.uid);
        leaveQueue(uid);
        // ✅ [수정1] ref를 통해 최신 콜백 호출
        onMatchedRef.current({ partner, roomId });
      }
    });

    // 점 애니메이션
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 500);

    // ✅ [수정8] cleanup: 매칭 안 됐을 때만 대기열 제거
    return () => {
      unsub();
      clearInterval(interval);
      if (!isMatchedRef.current) leaveQueue(uid);
    };
    // ✅ [수정2] profile 객체 대신 개별 프로퍼티 등록
  }, [uid, nickname, gender, region, genderFilter]);

  // ✅ [수정9] uid 없을 때 로그인 안내
  if (!uid) {
    return (
      <div style={{ textAlign:"center", padding:"60px 0", color:"#666680" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <p style={{ margin:0, fontSize:15, color:"#f0f0ff" }}>로그인이 필요해요</p>
        <p style={{ margin:"8px 0 0", fontSize:13 }}>로그인 후 술친구를 찾을 수 있어요</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign:"center", paddingTop:60 }}>
      <div style={{ fontSize:56, marginBottom:20, animation:"bob 1.5s ease-in-out infinite" }}>🍺</div>
      <style>{`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", color:"#f0f0ff", margin:"0 0 8px", fontSize:22 }}>
        매칭 중{dots}
      </h2>
      <p style={{ color:"#666680", fontSize:14, margin:"0 0 6px" }}>
        {nickname}님의 지역: {region}
      </p>
      <p style={{ color:"#555570", fontSize:13, margin:"0 0 32px" }}>
        {waitCount > 0 ? `현재 ${waitCount}명 대기 중` : "주변에서 찾는 중이에요"}
      </p>
      <button
        type="button" // ✅ [수정7]
        onClick={onCancel}
        style={{
          background:"none", border:"1px solid #2a2a40", color:"#666680",
          borderRadius:12, padding:"10px 24px", cursor:"pointer",
          fontSize:13, fontFamily:"inherit",
        }}
      >취소</button>
    </div>
  );
};

// ============================================================
//  3단계: 실제 채팅방
//
//  ✅ [수정3] 메시지 전송 300ms 쿨다운 (스팸 방지)
//  ✅ [수정4] myUid null 체크
//  ✅ [수정5] Shift+Enter 줄바꿈 지원 (textarea로 변경)
//  ✅ [수정10] useEffect 의존성 배열 점검 완료
// ============================================================
const ChatRoom = ({ roomId, myUid, myProfile, partner, onLeave }) => {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [partnerLeft, setPartnerLeft] = useState(false);
  const msgEndRef    = useRef(null);   // 스크롤 맨 아래 자동 이동용
  const lastSentRef  = useRef(0);      // ✅ [수정3] 마지막 전송 시각 기록

  // ✅ [수정4] myUid null 체크
  if (!myUid) {
    return (
      <div style={{ textAlign:"center", padding:"60px 0", color:"#666680" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <p style={{ margin:0, fontSize:15, color:"#f0f0ff" }}>로그인이 필요해요</p>
      </div>
    );
  }

  useEffect(() => {
    // 채팅 메시지 실시간 구독
    const unsubMsg   = subscribeMessages(roomId, setMessages);
    // 상대방 나감 감지
    const unsubLeave = onPartnerLeave(roomId, myUid, () => setPartnerLeft(true));
    return () => { unsubMsg(); unsubLeave(); };
    // ✅ [수정10] roomId, myUid 두 가지만 deps 등록 (정확한 최소 의존성)
  }, [roomId, myUid]);

  // 새 메시지가 올 때마다 자동 스크롤
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  // 메시지 전송
  const send = () => {
    if (!input.trim() || partnerLeft) return;

    // ✅ [수정3] 300ms 쿨다운 → 도배/스팸 방지
    const now = Date.now();
    if (now - lastSentRef.current < 300) return;
    lastSentRef.current = now;

    // 500자 초과 차단 (firebase.js에서도 체크하지만 이중 방어)
    if (input.length > 500) {
      alert("메시지는 최대 500자까지 보낼 수 있어요.");
      return;
    }

    sendMessage(roomId, myUid, input.trim());
    setInput("");
  };

  const leave = () => {
    leaveRoom(roomId, myUid);
    onLeave();
  };

  // ✅ [수정5] Enter → 전송 / Shift+Enter → 줄바꿈
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 기본 줄바꿈 방지
      send();
    }
    // Shift+Enter는 기본 동작(줄바꿈) 허용
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 200px)" }}>

      {/* 상대방 정보 헤더 */}
      <div style={{
        background:"#111120", border:"1px solid #1e1e32", borderRadius:16,
        padding:"14px 16px", marginBottom:12,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:40, height:40, background:"linear-gradient(135deg,#F5A623,#e89018)",
            borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
          }}>
            {partner.gender==="남" ? "👨" : partner.gender==="여" ? "👩" : "🙂"}
          </div>
          <div>
            <div style={{ color:"#f0f0ff", fontWeight:600, fontSize:14 }}>{partner.nickname}</div>
            <div style={{ color:"#666680", fontSize:12 }}>
              {partner.region} · {partner.gender==="선택 안 함" ? "비공개" : partner.gender+"성"}
            </div>
          </div>
        </div>
        <button
          type="button" // ✅ [수정7]
          onClick={leave}
          style={{
            background:"none", border:"1px solid #2a2a40", color:"#666680",
            borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit",
          }}
        >나가기</button>
      </div>

      {/* 상대방 나감 알림 배너 */}
      {partnerLeft && (
        <div style={{
          background:"#2a1a1a", border:"1px solid #aa443344",
          borderRadius:12, padding:"10px 14px", marginBottom:12,
          color:"#cc8888", fontSize:13, textAlign:"center",
        }}>
          상대방이 채팅을 나갔어요 😢
        </div>
      )}

      {/* 메시지 목록 */}
      <div style={{
        flex:1, overflowY:"auto",
        display:"flex", flexDirection:"column", gap:8, paddingRight:4,
      }}>
        {messages.length===0 && (
          <div style={{ textAlign:"center", padding:"30px 0", color:"#444460" }}>
            <p style={{ margin:0, fontSize:14 }}>🍻 {partner.nickname}님과 연결됐어요!</p>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"#333350" }}>먼저 인사해보세요</p>
          </div>
        )}
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
                // ✅ 줄바꿈 문자(\n) 화면 표시 처리
                whiteSpace:"pre-wrap", wordBreak:"break-word",
              }}>{m.text}</div>
            </div>
          );
        })}
        {/* 자동 스크롤 앵커 */}
        <div ref={msgEndRef} />
      </div>

      {/* 입력창 — ✅ [수정5] textarea로 변경하여 Shift+Enter 줄바꿈 지원 */}
      <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={partnerLeft ? "상대방이 나갔어요" : "메시지 입력... (Shift+Enter: 줄바꿈)"}
          disabled={partnerLeft}
          maxLength={500} // 클라이언트 1차 방어
          rows={1}
          style={{
            flex:1, background:"#111120", border:"1px solid #2a2a40",
            borderRadius:12, color:"#f0f0ff", fontSize:14,
            padding:"12px 14px", fontFamily:"inherit", outline:"none",
            opacity: partnerLeft ? 0.5:1,
            resize:"none", maxHeight:120, overflowY:"auto",
            lineHeight:1.5,
          }}
        />
        <button
          type="button" // ✅ [수정7]
          onClick={send}
          disabled={!input.trim() || partnerLeft}
          style={{
            width:46, height:46, flexShrink:0,
            background: input.trim()&&!partnerLeft
              ? "linear-gradient(135deg,#F5A623,#e89018)":"#1a1a2e",
            border:"none", borderRadius:12, cursor:"pointer", fontSize:20,
            opacity: partnerLeft ? 0.4:1,
          }}
        >↑</button>
      </div>

      {/* 글자 수 표시 (500자 가까워지면 경고색) */}
      <div style={{
        textAlign:"right", fontSize:11, marginTop:4,
        color: input.length > 450 ? "#F5A623":"#333350",
      }}>
        {input.length}/500
      </div>
    </div>
  );
};

// ============================================================
//  메인 ChatPage — step 상태로 화면 전환
//  profile → filter → waiting → chat
// ============================================================
export default function ChatPage({ myUid }) {
  const [step, setStep]               = useState("profile");
  const [myProfile, setMyProfile]     = useState(null);
  const [genderFilter, setGenderFilter] = useState("전체");
  const [matchData, setMatchData]     = useState(null);

  // 1단계: 프로필 입력
  if (step==="profile") {
    return (
      <ProfileSetup
        onDone={(p) => { setMyProfile(p); setStep("filter"); }}
      />
    );
  }

  // 2단계: 성별 필터 선택
  if (step==="filter") {
    return (
      <div style={{ paddingTop:20 }}>
        <div style={{ fontSize:52, textAlign:"center", marginBottom:20 }}>🍻</div>
        <h2 style={{ fontFamily:"'Nanum Myeongjo',serif", color:"#f0f0ff", margin:"0 0 6px", fontSize:22, textAlign:"center" }}>
          같이 한잔해요
        </h2>
        <p style={{ color:"#666680", fontSize:14, margin:"0 0 32px", lineHeight:1.6, textAlign:"center" }}>
          같은 지역의 술친구를 찾아드려요
        </p>

        <div style={{ marginBottom:28 }}>
          <p style={{ color:"#9090b0", fontSize:13, margin:"0 0 10px" }}>누구를 만나고 싶으세요?</p>
          <div style={{ display:"flex", gap:8 }}>
            {["전체","남","여"].map(g => (
              <button
                key={g}
                type="button" // ✅ [수정7]
                onClick={() => setGenderFilter(g)}
                style={{
                  flex:1, padding:"11px 0",
                  border: genderFilter===g ? "1px solid #F5A623":"1px solid #2a2a40",
                  borderRadius:12,
                  background: genderFilter===g ? "#F5A62218":"#111120",
                  color: genderFilter===g ? "#F5A623":"#666680",
                  cursor:"pointer", fontSize:14, fontFamily:"inherit",
                  fontWeight: genderFilter===g ? 700:400,
                }}
              >
                {g==="전체" ? "👥 전체" : g==="남" ? "👨 남성" : "👩 여성"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button" // ✅ [수정7]
          onClick={() => setStep("waiting")}
          style={{
            width:"100%", padding:"14px 0",
            background:"linear-gradient(135deg,#F5A623,#e89018)",
            border:"none", borderRadius:14, color:"#0a0a14",
            fontWeight:700, fontSize:16, cursor:"pointer",
            fontFamily:"'Nanum Myeongjo',serif",
            boxShadow:"0 4px 20px rgba(245,166,35,0.3)",
          }}
        >🎲 매칭 시작</button>

        <button
          type="button" // ✅ [수정7]
          onClick={() => setStep("profile")}
          style={{
            width:"100%", marginTop:10, padding:"11px 0",
            background:"none", border:"1px solid #2a2a40", color:"#555575",
            borderRadius:14, cursor:"pointer", fontSize:13, fontFamily:"inherit",
          }}
        >프로필 수정</button>
      </div>
    );
  }

  // 3단계: 매칭 대기
  if (step==="waiting") {
    return (
      <WaitingScreen
        profile={myProfile}
        genderFilter={genderFilter}
        onCancel={() => setStep("filter")}
        onMatched={(data) => { setMatchData(data); setStep("chat"); }}
      />
    );
  }

  // 4단계: 채팅방
  if (step==="chat" && matchData) {
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