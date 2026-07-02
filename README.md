# 🍶 맛집술집 (Matjib Suljip)

> **전국 술집 탐방 & 술친구 매칭 플랫폼**  
> React · Firebase · Kakao Maps API · Vercel

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://soju-app.vercel.app)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange?logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🔗 배포 주소

**[https://soju-app.vercel.app](https://soju-app.vercel.app)**

---

## 📌 프로젝트 개요

"혼자 마시기 심심하다면?"이라는 아이디어에서 출발했습니다.  
전국의 술집을 탐색하고, 리뷰를 남기고, 같이 술 마실 사람을 실시간으로 찾아주는 **감성형 술집 아카이빙 & 소셜 플랫폼**입니다.

바이브 코딩(AI 보조 개발)만으로 시작해 실제 배포까지 완주했지만, 그 과정에서 Firebase, Vercel, Kakao Maps API 등 한 번도 써본 적 없는 기술 스택을 오로지 문제 해결 의지 하나로 정복해나간 기록이기도 합니다.

---

## 🗂️ 목차

1. [핵심 기능](#-핵심-기능)
2. [기술 스택](#-기술-스택)
3. [아키텍처](#-아키텍처)
4. [보안 설계](#-보안-설계)
5. [시행착오 & 성장 기록](#-시행착오--성장-기록)
6. [바이브 코딩의 한계와 개발자의 역할](#-바이브-코딩의-한계와-개발자의-역할)
7. [향후 개선 로드맵](#-향후-개선-로드맵)

---

## ✨ 핵심 기능

| 기능 | 설명 |
|---|---|
| **전국 술집 탐색** | 카카오 Local Search API 실시간 연동. 별도 DB 없이 전국 수백만 업소 즉시 검색 |
| **리뷰 & 평점** | Firebase Firestore에 `kakaoId` 기준으로 리뷰 저장. 술집 1개당 최대 5개 제한 |
| **직접 등록** | 카카오에 없는 숨은 술집을 카카오맵 클릭으로 위치 선택 후 직접 등록 |
| **로그인 시스템** | Firebase Auth — 구글 소셜 로그인 + 이메일/비밀번호 + 익명 로그인 |
| **마스터 관리자** | 코드에 계정 정보 없음. Firestore `/config/admins` UID 배열로 권한 관리 |
| **랜덤 채팅** | Firebase Realtime Database 기반 실시간 매칭. 성별 필터 지원 |
| **카카오맵 연동** | 술집 상세 페이지에서 카카오맵 바로가기. 직접 등록 시 지도 클릭으로 좌표 취득 |

---

## 🛠 기술 스택

```
Frontend   React 18 (Vite)          컴포넌트 기반 SPA
Auth       Firebase Authentication  구글·이메일·익명 로그인
Database   Firebase Firestore        리뷰·평점·직접 등록 술집
Realtime   Firebase Realtime DB     랜덤 채팅 매칭·메시지
Maps       Kakao Local Search API   전국 술집 실시간 검색
Hosting    Vercel                   CI/CD 자동 배포
보안       .env + Firebase Rules    민감 정보 완전 분리
```

---

## 🏗 아키텍처

### 핵심 설계: 하이브리드 데이터 구조

처음에는 모든 술집 데이터를 Firestore에 직접 저장하는 방식으로 시작했습니다.  
하지만 근본적인 문제를 발견했습니다.

> "카카오에 이미 전국 수백만 개 업소 데이터가 있는데,  
> 왜 낡아가는 복사본을 만들고 있는가?"

설계를 전면 재구성했습니다.

```
[카카오 API]           [Firebase Firestore]       [Realtime DB]
술집 탐색 · 검색  →    리뷰 · 평점만 저장    +    채팅 매칭
전국 실시간 최신        kakaoId 키로 연결          실시간 동기화
```

**이 구조의 장점:**

| 항목 | 기존 방식 | 하이브리드 |
|---|---|---|
| 술집 데이터 최신성 | 수동 업데이트 필요 | 카카오가 자동 유지 |
| Firestore 읽기 비용 | 술집 수만큼 소모 | 리뷰 수만 소모 |
| 전국 커버리지 | 직접 등록한 곳만 | 카카오 전체 |
| 유지보수 | 폐업 데이터 정기 삭제 필요 | 불필요 |

### Firestore 컬렉션 구조

```
/reviews/{kakao_{id} or custom_{id}}
  - barName, barAddress, barCategory
  - reviews: [ { id, user, uid, rating, text, date } ]

/bars/{autoId}                          ← 직접 등록 술집
  - name, address, category, tags, lat, lng

/config/admins                          ← 마스터 UID 목록 (클라이언트 접근 차단)
  - uids: ["uid1", "uid2"]
```

---

## 🔐 보안 설계

**"코드 어디에도 비밀은 없다"** 를 원칙으로 삼았습니다.

### 환경변수 분리

```
.env (git 제외)
├── VITE_FIREBASE_API_KEY
├── VITE_FIREBASE_PROJECT_ID
├── VITE_KAKAO_MAP_KEY       ← JavaScript 키
└── VITE_KAKAO_REST_API_KEY  ← REST 키 (도메인 제한 필수)
```

### Firebase Security Rules

```javascript
// Firestore: 리뷰는 로그인 유저만 작성, 최대 5개 강제
match /reviews/{id} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.reviews.size() <= 1;
  allow update: if request.auth != null
    && resource.data.reviews.size() < 5;
}

// 관리자 설정: 클라이언트 완전 차단
match /config/{doc} {
  allow read, write: if false;
}
```

```json
// Realtime DB: 본인 메시지만 전송, 500자 초과 차단
{
  "rules": {
    "chatRooms": {
      "$roomId": {
        "messages": {
          "$msgId": {
            ".validate": "newData.child('uid').val() === auth.uid
                          && newData.child('text').val().length <= 500"
          }
        }
      }
    }
  }
}
```

### XSS 방어

모든 사용자 입력은 Firestore 저장 전 `sanitizeInput()` 함수로 HTML 특수문자를 이스케이프 처리합니다.  
React 자체의 렌더링 이스케이프 + 서버 저장 전 sanitize 2중 방어 구조입니다.

---

## 🔥 시행착오 & 성장 기록

이 프로젝트의 가장 솔직한 부분입니다.  
Firebase와 Vercel을 단 한 번도 써본 적 없는 상태에서 시작했고,  
배포까지 가는 길은 예상보다 훨씬 험난했습니다.

---

### 1. Git 배포 — 홈 폴더 전체를 올릴 뻔했다

**상황:**  
`git push`를 시도했더니 `git status`에 `NTUSER.DAT`, `AppData/`, `Documents/` 등  
Windows 홈 폴더 전체가 추적 대상으로 잡혀 있었습니다.

**원인:**  
`git init`을 프로젝트 폴더가 아닌 `C:\Users\사용자명`에서 실행했던 것.

**해결:**  
홈 폴더의 `.git` 디렉토리를 `rmdir /s /q .git`으로 제거하고,  
`cd C:\soju_app\matjib-suljip`로 올바른 경로로 이동 후 재초기화.

**배운 것:**  
`git status` 결과를 반드시 확인하고 push하는 습관. 한 번의 실수가 개인정보 전체를 GitHub에 노출할 수 있다는 것.

---

### 2. Firebase 환경변수 — API 키가 코드에 하드코딩된 채로 배포됐다

**상황:**  
`firebase.js`에 `apiKey: "YOUR_API_KEY"` 더미값이 그대로 남아 있어  
배포 후 F12 콘솔에서 `auth/api-key-not-valid` 오류가 발생했습니다.

**원인:**  
두 개의 firebaseConfig 블록이 파일 안에 공존하는 상황.  
실제 값을 추가했지만 기존 더미 블록을 삭제하지 않아 충돌.

**해결:**  
파일 전체를 `Ctrl+A` → 삭제 후 올바른 config 블록 단일 재작성.  
이후 환경변수 구조를 `.env`로 완전히 전환하여 재발 방지.

**배운 것:**  
코드 일부 수정이 아닌 전체 구조를 이해하고 작업해야 한다.  
"파일 안에 무엇이 있는지 직접 읽는 능력"이 AI 도움 없이도 반드시 필요하다.

---

### 3. Firebase Realtime DB 30일 만료 이메일

**상황:**  
`[Firebase] 클라이언트 액세스가 5일 후에 만료됩니다` 이메일 수신.  
테스트 모드의 30일 제한을 사전에 인지하지 못했습니다.

**해결:**  
단순히 규칙을 다시 `true`로 열지 않고,  
인증 상태, 데이터 소유권, 메시지 길이 제한까지 포함한  
프로덕션 수준의 Security Rules로 업그레이드.

**배운 것:**  
Firebase 테스트 모드는 말 그대로 테스트용.  
서비스 오픈 전에 보안 규칙 설계는 선택이 아닌 필수.

---

### 4. 카카오맵 "지도를 불러오는 중" 무한 로딩

**상황:**  
카카오맵 SDK가 로드되지 않는다는 콘솔 오류.  
F12 → Sources → index.html을 확인하니  
`appkey=%VITE_KAKAO_MAP_KEY%` 그대로 출력되고 있었습니다.

**원인 추적:**  
① Vercel 환경변수명 오타 → `VITE_KAKAO_MAPKEY` vs `VITE_KAKAO_MAP_KEY`  
② 환경변수 추가 후 Redeploy를 하지 않음  
③ 카카오 콘솔에 Vercel 도메인 미등록

**해결:**  
세 가지를 순서대로 수정. Vercel 환경변수 정확히 등록 →  
Redeploy → 카카오 콘솔 Web 플랫폼에 `https://soju-app.vercel.app` 추가.

**배운 것:**  
외부 API를 연동할 때는 코드 외에도  
"키 발급 → 도메인 등록 → 환경변수 등록 → 재배포"  
4단계 체크리스트가 모두 완료되어야 작동한다.

---

## 🤖 바이브 코딩의 한계와 개발자의 역할

이 프로젝트는 AI 보조 개발(바이브 코딩)로 시작했습니다.  
AI는 코드를 빠르게 작성해주었지만, 다음과 같은 것들은 결코 해주지 않았습니다.

```
AI가 해준 것                    내가 직접 해야 했던 것
─────────────────────────────────────────────────────────
컴포넌트 구조 작성              올바른 폴더에 git init 하기
Firebase 함수 구현              환경변수 이름 정확히 맞추기
Security Rules 설계            카카오 콘솔 도메인 등록
XSS 방어 코드                  Vercel Redeploy 타이밍 이해
리뷰 유효성 검증               F12로 실제 오류 직접 읽기
```

**결론:**  
AI는 강력한 도구지만, 오류를 읽고, 원인을 추론하고, 도구의 동작 방식을 이해하는 능력은 개발자 본인의 것이어야 합니다.  

이 프로젝트를 통해 저는 **코드를 "생성"하는 것과 코드를 "이해"하는 것**이 전혀 다른 역량임을 몸으로 배웠습니다.

---

## 🚀 향후 개선 로드맵

### 단기 (1~2개월)

| 항목 | 내용 |
|---|---|
| 카카오맵 정상화 | 환경변수 통일 및 재배포 완료 후 지도 기능 검증 |
| 마스터 계정 설정 | Firestore `/config/admins`에 UID 등록 |
| Firebase Rules 강화 | 현재 Rules 프로덕션 검증 완료 |

### 중기 (3~6개월)

| 항목 | 내용 |
|---|---|
| Next.js 전환 | SSR 도입으로 SEO 개선 + API Routes로 REST 키 서버사이드 은닉 |
| 랜덤 채팅 고도화 | 위치 기반 반경 매칭 (Geohash 알고리즘) |
| 알림 기능 | FCM(Firebase Cloud Messaging)으로 리뷰 알림 |
| 테스트 코드 | Vitest + React Testing Library 도입 |

### 장기

| 항목 | 내용 |
|---|---|
| React Native / Expo 전환 | 동일 로직으로 iOS·Android 앱 출시 |
| BFF 레이어 | Node.js/Express 백엔드로 외부 API 캡슐화 |
| CI/CD 고도화 | GitHub Actions → Vercel 자동 배포 파이프라인 |

---

## 📁 프로젝트 구조

```
SOJU_APP/
├── src/
│   ├── App.jsx          # 루트 컴포넌트 · Firebase 인증 · 마스터 권한
│   ├── AuthPage.jsx     # 로그인 · 회원가입 화면
│   ├── BarsPage.jsx     # 술집 탐색 · 리뷰 (하이브리드 아키텍처)
│   ├── ChatPage.jsx     # 랜덤 채팅 매칭
│   └── firebase.js      # Firebase · 카카오 서비스 함수 전체
├── index.html           # 카카오맵 SDK 로드
├── .env.example         # 환경변수 예시 (실제 키 미포함)
├── .gitignore           # .env · node_modules 제외
└── MASTER_SETUP.md      # 마스터 계정 설정 가이드
```

---

## 🔧 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/1msuk/SOJU_APP.git
cd SOJU_APP

# 2. 패키지 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일에 Firebase · 카카오 키 입력

# 4. 개발 서버 실행
npm run dev
```

> **필수 사전 설정:**  
> Firebase 콘솔에서 Firestore · Realtime DB · Authentication 활성화  
> 카카오 개발자 콘솔에서 Web 플랫폼에 `http://localhost:5173` 등록

---

## 👤 개발자

| | |
|---|---|
| **이름** | 장원석 (1msuk) |
| **GitHub** | [github.com/1msuk](https://github.com/1msuk) |
| **전공** | 컴퓨터공학 (부전공: 경영학) |
| **목표** | 데이터 엔지니어링 / 백엔드 개발 |

---

> "코드를 생성하는 것은 AI가 해줄 수 있다.  
> 하지만 왜 안 되는지를 이해하고, 고치는 것은 개발자의 몫이다."
