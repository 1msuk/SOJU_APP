import { useState, useEffect } from "react";
import {
  signInAnon, onAuthChange,
  subscribeBars, addBar, addReview,
} from "./firebase";

const CATEGORIES = ["전체","포차","이자카야","맥주바","소주방","루프탑바","와인바","호프집","기타"];
const REGIONS    = ["전체","서울","부산","대구","인천","광주","대전","울산","경기","강원","충청","전라","경상","제주"];

const MASTER_UID = "wef0L603Xtc9jfxVXXjKG1iBhzA2"; 

// ── 별점 ─────────────────────────────────────────────────────
const Stars = ({ value, onChange, size=20, readonly=false }) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize:size, cursor:readonly?"default":"pointer",
            color: s<=(hover||value) ? "#F5A623" : "#2a2a3a",
            transition:"all 0.1s",
            transform: !readonly && hover===s ? "scale(1.3)" : "scale(1)",
            display:"inline-block", lineHeight:1, userSelect:"none",
          }}>★</span>
      ))}
    </div>
  );
};

const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null;

// ── 술집 카드 ────────────────────────────────────────────────
const BarCard = ({ bar, onClick }) => {
  const avgRating = avg(bar.reviews.map(r=>r.rating));
  return (
    <div onClick={() => onClick(bar)}
      style={{
        background:"linear-gradient(145deg,#111120,#0e0e1c)",
        border:"1px solid #1e1e32", borderRadius:16,
        padding:"16px", cursor:"pointer", marginBottom:10,
        transition:"all 0.25s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = "1px solid #F5A62350";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(245,166,35,0.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = "1px solid #1e1e32";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{
          width:52, height:52, background:"#1a1a2e", borderRadius:13,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, flexShrink:0, border:"1px solid #2a2a40",
        }}>{bar.img}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#f0f0ff", fontFamily:"'Nanum Myeongjo',serif" }}>{bar.name}</h3>
            <span style={{ fontSize:11, color:"#555570", flexShrink:0, marginLeft:8 }}>{bar.region}</span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:4 }}>
            <span style={{ background:"#F5A62318", color:"#F5A623", fontSize:10, padding:"2px 8px", borderRadius:20, border:"1px solid #F5A62330", fontWeight:600 }}>{bar.category}</span>
            {avgRating
              ? <span style={{ color:"#c0c0d8", fontSize:12 }}>⭐ {avgRating} <span style={{ color:"#555570" }}>({bar.reviews.length})</span></span>
              : <span style={{ color:"#444460", fontSize:12 }}>리뷰 없음</span>}
          </div>
          <p style={{ margin:"6px 0 0", color:"#666680", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{bar.desc}</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
        {(bar.tags||[]).map(t => (
          <span key={t} style={{ fontSize:11, color:"#555575", background:"#16162a", padding:"2px 8px", borderRadius:20, border:"1px solid #252540" }}>#{t}</span>
        ))}
      </div>
    </div>
  );
};

// ── 술집 상세 (🗺️ 카카오맵 연동 및 로딩 버그 완벽 수정) ───────────────────────────
const BarDetail = ({ bar, myUid, onBack }) => {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false); // 지도가 진짜 성공적으로 그려졌는지 체크
  const avgRating = avg(bar.reviews.map(r=>r.rating));

  useEffect(() => {
  // 1. 카카오맵 SDK와 주소 검색(services) 서비스가 모두 존재하는지 체크
  if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
    console.warn("카카오맵 SDK 또는 services 라이브러리가 로드되지 않았습니다. index.html을 확인하세요.");
    return;
  }
  
  const container = document.getElementById("kakao-detail-map");
  if (!container) return;

  // 2. 화면이 부드럽게 뜬 후 안전하게 지도를 그리도록 0.3초의 유예를 줍니다.
  const timer = setTimeout(() => {
    // ⭐️ [여기만 추가!] 카카오맵 라이브러리가 완전히 로드된 후 내부 로직을 실행하도록 보장합니다.
    window.kakao.maps.load(() => {
      try {
        const geocoder = new window.kakao.maps.services.Geocoder();
        
        geocoder.addressSearch(bar.address, (result, status) => {
          // 주소 검색 성공 시
          if (status === window.kakao.maps.services.Status.OK) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            
            const map = new window.kakao.maps.Map(container, {
              center: coords,
              level: 3,
              draggable: true,
              scrollwheel: true,
            });

            new window.kakao.maps.Marker({
              map: map,
              position: coords,
              title: bar.name,
            });

            // 깨짐 방지 릴레이아웃 후 로딩 상태 해제!
            setTimeout(() => {
              map.relayout();
              map.setCenter(coords);
              setMapLoaded(true); // 👈 여기서 로딩창을 싹 걷어냅니다.
            }, 200);

          } else {
            // 주소 검색 실패 시 (기본 서울 시청 지도로 대체하고 로딩창 제거)
            console.warn(`주소 검색 실패: ${bar.address}. 기본 지도를 띄웁니다.`);
            const defaultCoords = new window.kakao.maps.LatLng(37.5665, 126.9780);
            const map = new window.kakao.maps.Map(container, {
              center: defaultCoords,
              level: 3,
            });
            setMapLoaded(true); 
          }
        });
      } catch(e) {
        console.error("카카오맵 초기화 실패:", e);
        setMapLoaded(true); // 에러가 나더라도 로딩 글자는 지워줍니다.
      }
    }); // ⭐️ [여기만 추가!] load 함수 닫는 괄호
  }, 300);

  return () => clearTimeout(timer);
}, [bar.address, bar.name]);

  const submit = async () => {
    if (!rating || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addReview(bar.id, { user:"익명", rating, text:text.trim(), uid:myUid });
      setShowForm(false); setRating(0); setText("");
    } catch(e) { alert("리뷰 등록 실패: " + e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ animation:"slideUp 0.3s ease" }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#F5A623", cursor:"pointer", fontSize:14, padding:"0 0 16px", fontFamily:"inherit" }}>← 목록으로</button>

      <div style={{ background:"#111120", border:"1px solid #1e1e32", borderRadius:20, padding:20, marginBottom:14 }}>
        <div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:14 }}>
          <div style={{ width:64, height:64, background:"#1a1a2e", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, border:"1px solid #2a2a40" }}>{bar.img}</div>
          <div>
            <h2 style={{ margin:"0 0 4px", fontFamily:"'Nanum Myeongjo',serif", fontSize:22, color:"#f0f0ff" }}>{bar.name}</h2>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ background:"#F5A62318", color:"#F5A623", fontSize:11, padding:"2px 10px", borderRadius:20, border:"1px solid #F5A62330" }}>{bar.category}</span>
              <span style={{ color:"#555570", fontSize:12 }}>{bar.region}</span>
            </div>
          </div>
        </div>
        <p style={{ margin:"0 0 10px", color:"#9090b0", fontSize:14, lineHeight:1.6 }}>{bar.desc}</p>
        <p style={{ margin:"0 0 12px", color:"#555575", fontSize:13 }}>📍 {bar.address}</p>

        {/* 지도 컨테이너 박스 */}
        <div 
          id="kakao-detail-map" 
          style={{ 
            width: "100%", 
            height: "220px", 
            borderRadius: 12, 
            marginBottom: 12, 
            border: "1px solid #252540",
            backgroundColor: "#0e0e1c",
            position: "relative",
            overflow: "hidden",
          }}>
          {/* 지도가 완전히 준비되기 전까지만 오버레이로 로딩 표시 */}
          {!mapLoaded && (
            <div style={{ 
              position: "absolute", 
              top: 0, left: 0, width: "100%", height: "100%",
              backgroundColor: "#0e0e1c",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "#444460",
              zIndex: 10,
            }}>
              <div style={{ fontSize: 24, marginBottom: 6, animation: "spin 2s linear infinite" }}>🗺️</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: 12 }}>지도 로딩 중...</div>
            </div>
          )}
        </div>

        {bar.phone && <p style={{ margin:0, color:"#555575", fontSize:13 }}>📞 {bar.phone}</p>}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <h3 style={{ margin:0, color:"#f0f0ff", fontSize:16, fontFamily:"'Nanum Myeongjo',serif" }}>리뷰 {bar.reviews.length}개</h3>
          {avgRating && <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
            <Stars value={Math.round(avgRating)} size={16} readonly />
            <span style={{ color:"#F5A623", fontSize:14, fontWeight:700 }}>{avgRating}</span>
          </div>}
        </div>
        {bar.reviews.length < 5
          ? <button onClick={() => setShowForm(!showForm)} style={{
              background: showForm ? "#1a1a2e" : "linear-gradient(135deg,#F5A623,#e89018)",
              color: showForm ? "#F5A623" : "#0a0a14",
              border: showForm ? "1px solid #F5A62340" : "none",
              borderRadius:10, padding:"8px 16px", cursor:"pointer",
              fontSize:13, fontWeight:700, fontFamily:"inherit",
            }}>{showForm ? "취소" : "리뷰 쓰기"}</button>
          : <span style={{ color:"#444460", fontSize:12 }}>최대 5개 도달</span>
        }
      </div>

      {showForm && (
        <div style={{ background:"#111120", border:"1px solid #F5A62330", borderRadius:16, padding:16, marginBottom:14, animation:"slideUp 0.2s ease" }}>
          <p style={{ margin:"0 0 10px", color:"#9090b0", fontSize:13 }}>별점 선택 (필수)</p>
          <Stars value={rating} onChange={setRating} size={28} />
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="분위기, 안주, 가격 등을 알려주세요"
            style={{ width:"100%", minHeight:80, background:"#0e0e1c", border:"1px solid #2a2a40", borderRadius:10, color:"#f0f0ff", fontSize:13, padding:12, marginTop:12, resize:"none", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
          <button onClick={submit} disabled={!rating||!text.trim()||submitting} style={{
            marginTop:10, width:"100%", padding:"11px 0",
            background: rating&&text.trim()&&!submitting ? "linear-gradient(135deg,#F5A623,#e89018)" : "#1a1a2e",
            color: rating&&text.trim()&&!submitting ? "#0a0a14" : "#444460",
            border:"none", borderRadius:10, cursor:"pointer",
            fontWeight:700, fontSize:14, fontFamily:"inherit",
          }}>{submitting ? "등록 중..." : "리뷰 등록"}</button>
        </div>
      )}

      {bar.reviews.length===0 && (
        <div style={{ textAlign:"center", padding:"30px 0", color:"#444460" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🥃</div>
          <p style={{ margin:0, fontSize:14 }}>첫 번째 리뷰를 남겨보세요!</p>
        </div>
      )}

      {bar.reviews.map(r => (
        <div key={r.id} style={{ background:"#111120", border:"1px solid #1e1e32", borderRadius:14, padding:"14px 16px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
            <div>
              <span style={{ color:"#f0f0ff", fontSize:13, fontWeight:600 }}>{r.user}</span>
              <Stars value={r.rating} size={13} readonly />
            </div>
            <span style={{ color:"#444460", fontSize:11 }}>{r.date}</span>
          </div>
          <p style={{ margin:0, color:"#9090b0", fontSize:13, lineHeight:1.5 }}>{r.text}</p>
        </div>
      ))}
    </div>
  );
};

// ── 술집 등록 폼 ─────────────────────────────────────────────
const RegisterBar = ({ onClose }) => {
  const [form, setForm] = useState({ name:"", category:"포차", region:"서울", address:"", phone:"", desc:"", tags:"", img:"🍺" });
  const [submitting, setSubmitting] = useState(false);
  const emojis = ["🍺","🍻","🍶","🥃","🍷","🏮","🌃","🍸","🍾"];
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async () => {
    if (!form.name.trim()||!form.address.trim()||submitting) return;
    setSubmitting(true);
    try {
      await addBar({ ...form, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean), reviews:[] });
      onClose();
    } catch(e) { alert("등록 실패: " + e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ animation:"slideUp 0.3s ease" }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <button onClick={onClose} style={{ background:"none", border:"none", color:"#F5A623", cursor:"pointer", fontSize:14, padding:"0 0 16px", fontFamily:"inherit" }}>← 취소</button>
      <h2 style={{ margin:"0 0 20px", fontFamily:"'Nanum Myeongjo',serif", fontSize:22, color:"#f0f0ff" }}>술집 등록</h2>

      <div style={{ marginBottom:16 }}>
        <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:8 }}>아이콘 선택</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {emojis.map(e => (
            <button key={e} onClick={() => set("img",e)} style={{
              width:44, height:44, fontSize:22,
              background: form.img===e ? "#F5A62220" : "#111120",
              border: form.img===e ? "2px solid #F5A623" : "1px solid #1e1e32",
              borderRadius:12, cursor:"pointer",
            }}>{e}</button>
          ))}
        </div>
      </div>

      {[
        {key:"name",   label:"술집 이름 *",         ph:"예: 달빛 포차"},
        {key:"address",label:"주소 (정확히 적어야 지도가 뜹니다) *", ph:"예: 대구 중구 동성로2길 50"},
        {key:"phone",  label:"전화번호",              ph:"예: 02-1234-5678"},
        {key:"desc",   label:"소개",                  ph:"분위기, 특징을 간단히 써주세요"},
        {key:"tags",   label:"태그 (쉼표로 구분)",    ph:"예: 혼술, 감성, 야장"},
      ].map(({key,label,ph}) => (
        <div key={key} style={{ marginBottom:14 }}>
          <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:6 }}>{label}</label>
          {key==="desc"
            ? <textarea value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph}
                style={{ width:"100%", minHeight:70, background:"#0e0e1c", border:"1px solid #2a2a40", borderRadius:10, color:"#f0f0ff", fontSize:13, padding:"10px 12px", resize:"none", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
            : <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph}
                style={{ width:"100%", background:"#0e0e1c", border:"1px solid #2a2a40", borderRadius:10, color:"#f0f0ff", fontSize:13, padding:"10px 12px", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
          }
        </div>
      ))}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {[{key:"category",label:"카테고리",opts:CATEGORIES.slice(1)},{key:"region",label:"지역",opts:REGIONS.slice(1)}].map(({key,label,opts})=>(
          <div key={key}>
            <label style={{ color:"#9090b0", fontSize:12, display:"block", marginBottom:6 }}>{label}</label>
            <select value={form[key]} onChange={e=>set(key,e.target.value)}
              style={{ width:"100%", background:"#0e0e1c", border:"1px solid #2a2a40", borderRadius:10, color:"#f0f0ff", fontSize:13, padding:"10px 12px", fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
              {opts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={!form.name.trim()||!form.address.trim()||submitting} style={{
        width:"100%", padding:"13px 0",
        background: form.name.trim()&&form.address.trim()&&!submitting ? "linear-gradient(135deg,#F5A623,#e89018)" : "#1a1a2e",
        color: form.name.trim()&&form.address.trim()&&!submitting ? "#0a0a14" : "#444460",
        border:"none", borderRadius:12, cursor:"pointer",
        fontWeight:700, fontSize:15, fontFamily:"'Nanum Myeongjo',serif",
      }}>{submitting ? "등록 중..." : "술집 등록하기"}</button>
    </div>
  );
};

// ── 메인 ─────────────────────────────────────────────────────
export default function BarsPage({ myUid, onTabChange }) {
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [category, setCategory] = useState("전체");
  const [region, setRegion] = useState("전체");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const unsub = subscribeBars((data) => { setBars(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = bars
    .filter(b => category==="전체" || b.category===category)
    .filter(b => region==="전체"   || b.region===region)
    .filter(b => !search || b.name.includes(search) || (b.tags||[]).some(t=>t.includes(search)))
    .sort((a,b) => {
      if (sortBy==="rating")  return avg(b.reviews.map(r=>r.rating)) - avg(a.reviews.map(r=>r.rating));
      if (sortBy==="reviews") return b.reviews.length - a.reviews.length;
      return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
    });

  if (showRegister) return <RegisterBar onClose={() => setShowRegister(false)} />;
  if (selectedBar) {
    const live = bars.find(b=>b.id===selectedBar.id) || selectedBar;
    return <BarDetail bar={live} myUid={myUid} onBack={() => setSelectedBar(null)} />;
  }

  return (
    <div>
      {myUid === MASTER_UID && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
          <button onClick={() => setShowRegister(true)} style={{
            background:"linear-gradient(135deg,#F5A623,#e89018)", border:"none", color:"#0a0a14",
            borderRadius:12, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit",
          }}>+ 술집 등록 (관리자)</button>
        </div>
      )}

      <div style={{ display:"flex", gap:10, alignItems:"center", background:"#111120", border:"1px solid #1e1e32", borderRadius:12, padding:"10px 14px", marginBottom:12 }}>
        <span style={{ color:"#555575" }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="술집 이름, 태그 검색"
          style={{ flex:1, background:"none", border:"none", outline:"none", color:"#f0f0ff", fontSize:13, fontFamily:"inherit" }} />
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:10, paddingBottom:4 }}>
        {REGIONS.map(r => (
          <button key={r} onClick={()=>setRegion(r)} style={{
            padding:"5px 12px", border: region===r ? "1px solid #F5A623":"1px solid #1e1e32",
            borderRadius:20, background: region===r ? "#F5A62215":"#111120",
            color: region===r ? "#F5A623":"#555575",
            cursor:"pointer", whiteSpace:"nowrap", fontSize:12, fontFamily:"inherit",
            fontWeight: region===r?700:400, flexShrink:0,
          }}>{r}</button>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:12, paddingBottom:4 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)} style={{
            padding:"5px 12px", border: category===c ? "1px solid #aabbff55":"1px solid #1e1e32",
            borderRadius:20, background: category===c ? "#4466ff18":"#111120",
            color: category===c ? "#aabbff":"#555575",
            cursor:"pointer", whiteSpace:"nowrap", fontSize:12, fontFamily:"inherit",
            fontWeight: category===c?700:400, flexShrink:0,
          }}>{c}</button>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:12, justifyContent:"flex-end" }}>
        {[["recent","최신순"],["rating","평점순"],["reviews","리뷰순"]].map(([k,l]) => (
          <button key={k} onClick={()=>setSortBy(k)} style={{
            background:"none", border:"none",
            color: sortBy===k?"#F5A623":"#333350",
            cursor:"pointer", fontSize:12,
            fontWeight: sortBy===k?700:400, fontFamily:"inherit",
          }}>{l}{sortBy===k?" ▾":""}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"50px 0", color:"#444460" }}>
          <div style={{ fontSize:36, marginBottom:10, animation:"pulse 1s infinite" }}>🍶</div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          <p>술집 불러오는 중...</p>
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:"50px 0", color:"#333350" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🍺</div>
          <p>검색 결과가 없어요</p>
          {myUid === MASTER_UID && (
            <button onClick={()=>setShowRegister(true)} style={{ marginTop:12, background:"none", border:"1px solid #F5A62340", color:"#F5A623", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>이 술집을 등록해보세요</button>
          )}
        </div>
      ) : (
        <>
          <p style={{ margin:"0 0 12px", color:"#444460", fontSize:12 }}>총 {filtered.length}개 술집</p>
          {filtered.map(bar => <BarCard key={bar.id} bar={bar} onClick={setSelectedBar} />)}
        </>
      )}
    </div>
  );
}