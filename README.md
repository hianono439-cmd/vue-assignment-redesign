# 나갈까 — 날씨 맞춤 나들이 추천

날씨와 운전시간, 현재 진행 중인 행사를 함께 살펴보고 오늘 갈 만한 곳을 추천하는 Vue 서비스입니다. Composition API, 컴포넌트 분리, Vue Router, Pinia 전역 상태 관리, Axios 기반 실시간 데이터 연동, Motion for Vue 애니메이션과 Element Plus UI를 적용했습니다.

## 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 OpenWeatherMap과 TourAPI 키 입력
npm run dev
```

`.env.local`은 Git에서 제외되며 API 키를 소스코드에 직접 작성하지 않습니다.

## 페이지 경로

- `/#/`: 나들이 추천 중심의 메인 화면과 국내 날씨
- `/#/about`: 서비스 소개
- `/#/weather/:cityId`: 도시별 상세 기상 정보
- `/#/game`: 실시간 날씨 단서로 도시를 맞히는 미니 게임
- `/#/outings`: 출발지·운전시간·날씨를 반영한 현재 행사 추천
- `/#/world`: 전 세계 주요 도시 날씨 비교
- `/#/signup`: Element Plus 회원가입 폼
- 그 외 주소: 404 페이지

GitHub Pages에서 새로고침해도 경로를 찾을 수 있도록 Hash Router를 사용합니다.

## 프로젝트 구조

- `views/WeatherHomeView.vue`: 반응형 상태, 검색 필터링, 감시 및 라우터 이동 처리
- `views/WeatherDetailView.vue`: 동적 도시 ID로 상세 실시간 관측 정보 조회
- `views/WeatherAboutView.vue`: 서비스 소개 화면
- `views/WeatherGameView.vue`: 5라운드 도시 날씨 맞히기 게임
- `views/OutingRecommendationsView.vue`: 2시간 이내 현재 행사와 날씨 기반 나들이 추천
- `views/WorldWeatherView.vue`: 6개 대륙 12개 도시의 실시간 날씨 비교
- `views/SignUpView.vue`: 입력값 검증과 완료 화면을 포함한 회원가입
- `views/NotFoundView.vue`: Catch-all 404 화면
- `components/exercise/`: 공통 카드, 검색창, 날씨 카드 컴포넌트
- `components/exercise/WeatherAssistant.vue`: 모든 화면에서 사용하는 날씨 챗봇 패널
- `composables/useWeatherAssistant.js`: 자연어 질문을 현재 날씨 데이터와 연결하는 분석 로직
- `router/index.js`: 지연 로딩 라우트와 Hash Router 설정
- `services/weatherApi.js`: Axios 인스턴스, OpenWeatherMap 요청 및 응답 변환
- `stores/weatherStore.js`: 홈과 상세 페이지가 공유하는 실시간 날씨 상태
- `stores/worldWeatherStore.js`: 세계 도시 날씨 상태
- `stores/memberStore.js`: 실습용 회원 프로필 상태와 브라우저 저장

## Composition API 실습

- `searchQuery`, `selectedCityInfo`를 `ref`로 관리
- `filteredWeatherList`를 `computed`로 계산
- `selectedCityInfo` 변경을 `watch`로 감시해 콘솔 기록
- 검색어와 검색 결과를 `watchEffect`로 자동 추적해 콘솔 기록
- 빈 검색어, 일치 결과, 검색 결과 없음의 세 가지 화면 상태 처리
- 전국 8개 도시의 위도·경도를 이용해 실시간 데이터 조회
- 도시 이름의 받침 여부를 판별해 `이/가` 조사를 올바르게 표시

## Pinia Store 실습

- `stores/configStore.js`에서 온도 단위 상태를 전역 관리
- `unit` state의 초깃값은 `celsius`
- `unitSymbol` getter로 현재 단위의 `°C` 또는 `°F` 기호 제공
- `toggleUnit` action으로 섭씨와 화씨 전환
- 상단 `UnitToggler.vue`에서 단위를 변경하면 홈 카드와 상세 화면에 동시에 반영
- `useTemperature` composable에서 중복되는 온도 변환 로직 관리

## Axios 날씨 데이터 연동

- `axios.create()`로 OpenWeatherMap 전용 API 클라이언트 구성
- `/data/2.5/weather`에 도시별 위도·경도, `metric`, `kr` 옵션 전달
- API 응답을 카드와 상세 화면에서 사용하는 공통 데이터 구조로 변환
- 초기 로딩, 일부 도시 실패, 전체 실패, 요청 지연 및 재시도 UI 제공
- 상세 페이지에서 습도, 풍속, 기압, 가시거리, 구름량, 일출·일몰 표시

## 마이크로 인터랙션 및 스크롤 애니메이션

- Motion for Vue의 `useScroll`, `useTransform`으로 스크롤 진행 바와 배경 패럴랙스 구현
- 검색·날씨 영역이 화면에 들어올 때 한 번만 자연스럽게 나타나는 스크롤 진입 효과
- 도시 카드의 순차 등장, 검색 결과 재배치 애니메이션과 호버·클릭 반응
- 실시간 상태 표시와 새로고침 아이콘의 상태 기반 애니메이션
- `prefers-reduced-motion` 설정을 존중해 움직임에 민감한 사용자의 애니메이션 최소화
- 넓은 카드와 기본 카드를 섞은 반응형 Bento Grid 레이아웃
- 버튼으로 카드를 3D 플립해 체감온도·습도·풍속·가시거리 빠른 정보 표시

## 날씨 미니 게임과 나들이 도우미

- 현재 기온·체감온도·습도·풍속을 단서로 도시를 맞히는 5라운드 게임
- 정답 판정, 점수 계산, 축하 애니메이션과 기기별 최고 점수 저장
- 화면 오른쪽 아래에서 언제든 열 수 있는 나들이 도우미
- 국내외 도시별 현재 날씨, 옷차림, 우산 필요 여부와 가장 덥거나 습한 도시 분석
- 회원 이름과 관심 도시를 연결해 맞춤 인사와 관심 도시 날씨 제공
- 대화에서 회원가입·세계 날씨 화면으로 바로 이동하는 안내 버튼 제공
- “오늘 어디 놀러갈까?” 질문에서 나들이 추천 화면으로 이동
- 질문은 외부 서비스로 보내지 않고 브라우저에 로딩된 OpenWeather 데이터만 사용

나들이 도우미는 브라우저에 불러온 실시간 데이터를 질문에 맞게 정리해서 보여줍니다. 질문 내용은 외부로 전송하지 않습니다.

## Element Plus 활용

- `main.js`에서 Element Plus와 기본 스타일을 전역 등록
- `el-form`, `el-input`, `el-select`, `el-checkbox`로 회원가입 폼 구성
- 이름·이메일·비밀번호·비밀번호 확인·필수 동의 항목 검증
- 비밀번호는 저장하지 않고 이름·이메일·관심 도시만 브라우저에 보관
- 세계 날씨 화면에서 `el-card`, `el-radio-group`, `el-tag`, `el-progress`, `el-loading`, `el-skeleton`, `el-alert` 활용
- 6개 대륙 12개 도시 필터링과 최고·최저·평균 기온 및 강수 도시 요약

## 날씨 맞춤 나들이 추천

- 사용자가 선택한 국내 도시 또는 브라우저 현재 위치를 출발지로 설정
- 한국관광공사 TourAPI에서 현재 진행 중인 전국 행사·전시 조회
- OpenStreetMap 기반 OSRM 자동차 경로 예상시간으로 최대 2시간 이내 후보 필터링
- 행사 장소의 OpenWeatherMap 현재 날씨와 실내·야외 여부를 추천점수에 반영
- 실시간 교통량은 반영하지 않으며, 예상 이동시간과 날씨는 출발 전 다시 확인 필요

## GitHub Pages 환경변수

저장소의 **Settings → Secrets and variables → Actions**에서 다음 Secret을 추가해야 배포 화면에서도 날씨를 불러올 수 있습니다.

```text
이름: OPENWEATHER_API_KEY
값: 본인의 OpenWeatherMap API 키

이름: TOUR_API_KEY
값: 공공데이터포털에서 발급받은 국문 관광정보 서비스 키
```

GitHub Actions가 두 값을 빌드 시 각각의 Vite 환경변수로 전달합니다.
