# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## 🚀 1. 프로젝트 기획 의도 및 핵심 기능 (Goal & Features)
사용자가 전국의 다양한 맛집과 숨은 술집을 웹에 등록하고 등록된 술집을 카테고리별, 지역별로 탐색하고 나만의 리뷰를 남길 수 있는 ‘감성형 맛집·술집 아카이빙 플랫폼’을 목표로 개발했습니다.

 📌 원래 구현하고자 했던 핵심 기능
Firebase 기반 실시간 데이터 연동: Firebase Firestore를 활용해 등록된 술집 목록 및 리뷰 데이터를 실시간(subscribeBars)으로 동기화

커스텀 UI/UX: 익명 로그인 기능,  5점 만점의 애니메이션 별점 컴포넌트, 카테고리/지역별 수평 스크롤 필터링 및 3가지 정렬(최신순, 평점순, 리뷰순) 기능 구현

 🗺️ 카카오맵 API 기반 상세 위치 제공: 사용자가 등록한 지번/도로명 주소를 Geocoder를 통해 좌표로 변환하여 상세 페이지 내에 정확한 지도로 시각화

## ⚠️ 2. 핵심 도전 과제 및 실패 분석 (Challenges & Failure Analysis)
이번 프로젝트에서 가장 고도화하고자 했던 '공공 데이터 및 외부 API를 통한 술집 정보 자동 등록 기능'은 기술적/환경적 한계로 인해 최종 구현에 실패하였습니다.

 ❌ 실패한 기능 및 구현 목표
지도 내 등록된 술집 자동 크롤링/가져오기 기능

원래 목적: 사용자가 일일이 주소와 이름을 입력하지 않아도, 특정 지역의 술집 데이터를 외부 지도 API(Kakao/Naver)나 공공데이터포털에서 자동으로 긁어와(Scraping/API Call) DB에 대량으로 적재하는 기능.

지도 검색을 통한 자동 주소 완성 및 등록 프로세스

원래 목적: 술집 등록 시 카카오맵 장소 검색 API를 연동하여, 키워드 검색만으로 이름, 주소, 전화번호를 자동으로 입력 박스에 바인딩하는 기능.

 🔍 실패 원인 분석 (Why?)
API 권한 및 쿼타(Quota) 제한: Kakao 장소 검색 API 및 로컬 API는 프론트엔드 단독 호출 시 CORS 에러 및 일일 제한 쿼타 문제가 발생했으며, 보안상 API Key가 클라이언트에 노출되는 위험이 있었습니다.

데이터 정제(Parsing)의 한계: 공공데이터포털의 음식점/상가 업소 정보 데이터(CSV/JSON)는 '술집'이라는 특정 카테고리만 정밀하게 필터링하기에 데이터의 노이즈(폐업 업소, 일반 음식점 혼재)가 너무 많았습니다. 백엔드(Node.js 등) 레이어 없이 Firebase와 React(CSR)만으로 대용량 데이터를 실시간 정제하기에는 브라우저 과부하 문제가 있었습니다.

비동기 타이밍 이슈: 상세 페이지 진입 시 지도가 깨지거나 로딩이 멈추는 버그가 발생했습니다. React의 렌더링 타이밍과 카카오맵 SDK의 DOM 삽입 타이밍이 어긋나 발생하는 현상임을 확인했습니다.

 ## ✨ 3. 실패를 통한 기술적 성장과 해결 방안 (What I Learned)
"실패는 단순한 중단이 아니라, 아키텍처의 한계를 깨닫고 백엔드의 필요성을 증명하는 과정이었습니다."

💡 문제를 우회하고 해결한 방법 (Current Solution)
UX 중심의 예외 처리와 안전장치 구축: 지도가 깨지는 버그를 해결하기 위해 setTimeout 유예 시간(300ms)을 부여하고, mapLoaded라는 상태(State) 값과 CSS 키프레임 애니메이션을 결합한 '커스텀 로딩 오버레이'를 직접 구현했습니다. 주소 검색이 실패하더라도 앱이 뻗지 않고 기본 지도(서울시청)를 띄우도록 예외 처리를 완벽히 마쳤습니다.

어드민(Admin) 데이터 관리 체계로 선회: 자동 등록 대신 MASTER_UID를 활용한 관리자 전용 등록 시스템을 구축하여, 검증된 고품질의 맛집 데이터만 수동으로 안전하게 적재될 수 있도록 기획을 유연하게 수정했습니다.

🚀 향후 보완 계획 (Next Step)
BFF(Backend For Frontend) 또는 Serverless 도입: 차기 버전에서는 Next.js API Routes나 Node.js 백엔드를 도입하여 외부 API Key를 안전하게 숨기고(Encapsulation), 서버 단에서 카카오 장소 검색 데이터를 미리 크롤링 및 정제(Parsing)하여 Firebase에 공급하는 파이프라인을 구축할 예정입니다.

Debounce 기반의 장소 검색 기능 추가: 사용자가 입력을 마쳤을 때만 API를 호출하는 Debounce 기술을 적용해 API 쿼타 소모를 최적화하는 주소 자동완성 기능을 반드시 완성할 것입니다.

## 웹 주소 : https://soju-app.vercel.app/
