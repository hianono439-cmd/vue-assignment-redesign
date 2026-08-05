<script setup>
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { motion } from 'motion-v'
import { RouterLink, useRouter } from 'vue-router'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCard from '../components/exercise/WeatherCard.vue'
import { useTemperature } from '../composables/useTemperature'
import { useWeatherStore } from '../stores/weatherStore'

const router = useRouter()
const weatherStore = useWeatherStore()
const searchQuery = ref('')
const selectedCityInfo = ref(null)

const weatherList = computed(() => weatherStore.weatherList)
const isInitialLoading = computed(
  () => weatherStore.isLoadingAll && weatherList.value.length === 0,
)
const loadError = computed(() => weatherStore.errorMessage)
const formattedLastUpdated = computed(() => {
  if (!weatherStore.lastUpdated) return ''

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(weatherStore.lastUpdated))
})

// 도시명 뒤에 붙는 '이/가'를 받침 유무에 맞게 결정한다.
const getSubjectParticle = (word) => {
  const normalizedWord = word?.trim()
  if (!normalizedWord) return ''

  const lastCharacterCode = normalizedWord.charCodeAt(normalizedWord.length - 1)
  const isHangulSyllable =
    lastCharacterCode >= 0xac00 && lastCharacterCode <= 0xd7a3

  if (!isHangulSyllable) return '이(가)'

  const hasFinalConsonant = (lastCharacterCode - 0xac00) % 28 !== 0
  return hasFinalConsonant ? '이' : '가'
}

const trimmedSearchQuery = computed(() => searchQuery.value.trim())

// 검색어가 비어 있으면 전체 도시를, 입력되면 일치하는 도시만 반환한다.
const filteredWeatherList = computed(() => {
  if (!trimmedSearchQuery.value) {
    return weatherList.value
  }

  return weatherList.value.filter((city) =>
    city.name.includes(trimmedSearchQuery.value),
  )
})

const todayLabel = computed(() =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date()),
)

// 기온, 비·눈, 바람을 기준으로 현재 나들이하기 무난한 도시를 고른다.
const outingWeatherCity = computed(() => {
  if (!weatherList.value.length) return null

  const getOutingScore = (city) => {
    const rainPenalty =
      city.status.includes('비') || city.status.includes('눈') ? 45 : 0
    return Math.abs(city.temp - 22) + rainPenalty + city.windSpeed * 0.7
  }

  return weatherList.value.reduce((bestCity, city) =>
    getOutingScore(city) < getOutingScore(bestCity) ? city : bestCity,
  )
})

const heroWeatherCity = computed(
  () => selectedCityInfo.value ?? outingWeatherCity.value,
)

const heroRawTemperature = computed(() => heroWeatherCity.value?.temp)
const {
  displayTemp: heroDisplayTemperature,
  unitSymbol: heroUnitSymbol,
} = useTemperature(heroRawTemperature)

// 메인 배너와 소개 영역도 전역 온도 단위 설정을 따라 표시한다.
const heroTemperature = computed(() => {
  if (heroDisplayTemperature.value === '—') return '—'
  return `${heroDisplayTemperature.value}${heroUnitSymbol.value}`
})

// 선택된 도시의 날씨에 맞춰 메인 배경 테마를 바꾼다.
const heroTheme = computed(() => {
  const status = heroWeatherCity.value?.status ?? ''
  if (status.includes('천둥') || status.includes('비')) return 'rain'
  if (status.includes('눈')) return 'snow'
  if (status.includes('안개')) return 'fog'
  if (status.includes('구름') || status === '흐림') return 'clouds'
  if (status === '맑음') return 'clear'
  return 'loading'
})

const heroHeadline = computed(() => {
  const headlines = {
    clear: ['햇살이 좋은 쪽으로,', '오늘은 나가볼까요.'],
    clouds: ['구름 사이 좋은 곳으로,', '오늘은 나가볼까요.'],
    rain: ['비가 와도 괜찮은 곳으로,', '오늘은 나가볼까요.'],
    snow: ['눈 오는 날 어울리는 곳으로,', '오늘은 나가볼까요.'],
    fog: ['천천히 다녀올 수 있는 곳으로,', '오늘은 나가볼까요.'],
    loading: ['날씨가 괜찮은 쪽으로,', '오늘은 나가볼까요.'],
  }
  return headlines[heroTheme.value]
})

const heroDescription = computed(() => {
  const descriptions = {
    clear: '맑은 날에 가기 좋은 행사와 가까운 장소를 확인하세요.',
    clouds: '걷기 좋은 일정과 가까운 행사를 확인하세요.',
    rain: '비를 피할 수 있는 전시와 실내 행사를 먼저 표시합니다.',
    snow: '이동시간이 짧은 실내 행사를 먼저 확인하세요.',
    fog: '가까운 곳부터 이동시간을 확인하세요.',
    loading: '날씨와 이동시간, 진행 중인 행사를 함께 확인합니다.',
  }
  return descriptions[heroTheme.value]
})

const rainDrops = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${(index * 17 + 7) % 100}%`,
  delay: `${(index % 8) * -0.17}s`,
  duration: `${0.85 + (index % 5) * 0.13}s`,
}))

const snowFlakes = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${(index * 23 + 3) % 100}%`,
  delay: `${(index % 9) * -0.45}s`,
  duration: `${4.2 + (index % 6) * 0.55}s`,
  size: `${4 + (index % 4) * 2}px`,
}))

const selectedCityParticle = computed(() =>
  getSubjectParticle(selectedCityInfo.value?.name),
)

const loadWeather = async (force = false) => {
  await weatherStore.loadAll({ force })

  if (selectedCityInfo.value) {
    selectedCityInfo.value =
      weatherStore.getWeatherById(selectedCityInfo.value.id) ?? null
  }
}

// 화면에 처음 들어왔을 때 전체 도시 날씨를 불러온다.
onMounted(() => {
  loadWeather()
})

// 선택 도시가 바뀌는 순간 이전 값과 새 값을 확인한다.
watch(selectedCityInfo, (newCityInfo, oldCityInfo) => {
  if (!newCityInfo) return

  const oldCityName = oldCityInfo?.name ?? '선택 없음'
  const statusMessage = `${newCityInfo.name}${getSubjectParticle(newCityInfo.name)} 선택되었습니다.`

  console.log(`[watch] 선택 도시: ${oldCityName} → ${newCityInfo.name}`)
  console.log(`[watch] 안내 문구: ${statusMessage}`)
})

// 검색어 또는 필터 결과가 달라질 때마다 검색 상태를 확인한다.
watchEffect(() => {
  const query = trimmedSearchQuery.value
  const matchedCities = filteredWeatherList.value.map((city) => city.name)

  if (!query) {
    console.log(`[watchEffect] 전체 ${matchedCities.length}개 도시 표시`)
    return
  }

  if (matchedCities.length > 0) {
    console.log(`[watchEffect] '${query}' 검색 결과: ${matchedCities.join(', ')}`)
    return
  }

  console.log(`[watchEffect] '${query}' 검색 결과 없음`)
})

const updateQuery = (query) => {
  searchQuery.value = query
}

const selectCity = (city) => {
  selectedCityInfo.value = city
}

const openDetail = (city) => {
  router.push({ name: 'weather-detail', params: { cityId: city.id } })
}

// Hash Router와 충돌하지 않도록 링크 대신 직접 해당 영역으로 이동한다.
const scrollToRecommendationGuide = () => {
  document.getElementById('how-it-works')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
</script>

<template>
  <section class="home-view" aria-labelledby="home-heading">
    <h2 id="home-heading" class="sr-only">날씨 기반 나들이 추천</h2>

    <section
      class="home-hero"
      :class="`home-hero--${heroTheme}`"
      aria-labelledby="hero-heading"
    >
      <div class="weather-scene" aria-hidden="true">
        <span class="scene-sun"></span>
        <span class="scene-cloud scene-cloud--one"></span>
        <span class="scene-cloud scene-cloud--two"></span>
        <span class="scene-fog scene-fog--one"></span>
        <span class="scene-fog scene-fog--two"></span>
        <span
          v-for="drop in rainDrops"
          :key="`rain-${drop.id}`"
          class="scene-rain"
          :style="{
            left: drop.left,
            animationDelay: drop.delay,
            animationDuration: drop.duration,
          }"
        ></span>
        <span
          v-for="flake in snowFlakes"
          :key="`snow-${flake.id}`"
          class="scene-snow"
          :style="{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
          }"
        ></span>
      </div>

      <div class="hero-copy">
        <p class="hero-eyebrow">오늘의 나들이 · {{ todayLabel }}</p>
        <h2 id="hero-heading">
          <span>{{ heroHeadline[0] }}</span>
          <em>{{ heroHeadline[1] }}</em>
        </h2>
        <p class="hero-description">
          {{ heroDescription }} 날씨와 운전시간, 진행 중인 행사를 함께 비교합니다.
        </p>
        <div class="hero-actions">
          <RouterLink class="hero-cta hero-cta--primary" to="/outings">
            오늘의 장소 추천받기 <span aria-hidden="true">→</span>
          </RouterLink>
          <a class="hero-cta hero-cta--secondary" href="#city-weather">
            도시 날씨 먼저 보기
          </a>
        </div>
      </div>

      <motion.aside
        class="hero-weather"
        :initial="{ opacity: 0, x: 18 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ delay: 0.25, duration: 0.5 }"
        aria-label="오늘의 추천 날씨"
      >
        <div class="hero-weather__topline">
          <span></span>
          현재 날씨
        </div>
        <template v-if="heroWeatherCity">
          <strong>{{ heroWeatherCity.name }}</strong>
          <p>{{ heroWeatherCity.status }}</p>
          <span class="hero-weather__temperature">{{ heroTemperature }}</span>
          <small>현재 나들이 날씨가 가장 무난한 도시</small>
        </template>
        <template v-else>
          <strong>날씨 확인 중</strong>
          <p>잠시만 기다려 주세요.</p>
          <span class="hero-weather__temperature">—</span>
        </template>
      </motion.aside>

      <div class="hero-flow" aria-label="추천 과정">
        <span><b>01</b> 출발 위치</span>
        <span><b>02</b> 지금 날씨</span>
        <span><b>03</b> 가까운 행사</span>
      </div>

      <button
        type="button"
        class="scroll-cue"
        @click="scrollToRecommendationGuide"
      >
        <span>추천 기준 보기</span>
        <i aria-hidden="true"></i>
      </button>
    </section>

    <motion.section
      id="how-it-works"
      class="story-section story-section--weather"
      :initial="{ opacity: 0, y: 44 }"
      :while-in-view="{ opacity: 1, y: 0 }"
      :in-view-options="{ once: true, amount: 0.28 }"
      :transition="{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="story-number">01</span>
      <div class="story-copy">
        <p>날씨 확인</p>
        <h2>가장 먼저, 오늘의 날씨를 읽습니다.</h2>
        <span>
          비와 눈, 바람, 체감온도를 확인해 야외와 실내 중 더 나은 일정을 고릅니다.
        </span>
      </div>
      <div class="story-weather-orbit" :class="`story-weather-orbit--${heroTheme}`">
        <span>{{ heroWeatherCity?.name ?? '현재 위치' }}</span>
        <strong>{{ heroTemperature }}</strong>
        <small>{{ heroWeatherCity?.status ?? '날씨 확인 중' }}</small>
        <i aria-hidden="true"></i>
      </div>
    </motion.section>

    <motion.section
      class="story-section story-section--drive"
      :initial="{ opacity: 0 }"
      :while-in-view="{ opacity: 1 }"
      :in-view-options="{ once: true, amount: 0.22 }"
      :transition="{ duration: 0.75 }"
    >
      <span class="story-number">02</span>
      <div class="story-copy">
        <p>2시간 이내</p>
        <h2>멀리 찾지 않고, 차로 2시간 안에서.</h2>
        <span>
          출발 도시나 현재 위치를 기준으로 예상 이동시간을 계산합니다.
          최대 1시간, 1시간 30분, 2시간까지 선택할 수 있습니다.
        </span>
      </div>
      <div class="drive-timeline" aria-label="이동시간 선택 예시">
        <span><b>60</b><small>분</small></span>
        <i></i>
        <span><b>90</b><small>분</small></span>
        <i></i>
        <span class="is-active"><b>120</b><small>분</small></span>
      </div>
    </motion.section>

    <motion.section
      class="story-section story-section--events"
      :initial="{ opacity: 0, y: 44 }"
      :while-in-view="{ opacity: 1, y: 0 }"
      :in-view-options="{ once: true, amount: 0.24 }"
      :transition="{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="story-number">03</span>
      <div class="story-copy">
        <p>진행 중인 행사</p>
        <h2>지금 열리는 곳만, 날씨에 맞는 순서로.</h2>
        <span>
          현재 진행 중인 행사와 전시에 이동시간과 날씨 점수를 적용합니다.
          비가 오면 실내 행사를 먼저 표시합니다.
        </span>
        <RouterLink class="story-cta" to="/outings">
          나들이 추천 시작하기 <span aria-hidden="true">→</span>
        </RouterLink>
      </div>
      <div class="event-preview" aria-hidden="true">
        <article>
          <span>전시</span>
          <strong>실내 전시</strong>
          <small>비 오는 날 우선 추천</small>
        </article>
        <article>
          <span>축제</span>
          <strong>야외 축제</strong>
          <small>맑은 날 우선 추천</small>
        </article>
        <article>
          <span>이동시간</span>
          <strong>가까운 순</strong>
          <small>최대 120분 이내</small>
        </article>
      </div>
    </motion.section>

    <BaseDashboardCard
      title="출발 전 날씨 확인"
      icon="🔍"
      heading-id="search-heading"
    >
      <SearchBar :query="searchQuery" @update-query="updateQuery" />
    </BaseDashboardCard>

    <BaseDashboardCard
      id="city-weather"
      title="오늘의 도시 날씨"
      icon="🏙️"
      heading-id="weather-heading"
    >
      <div class="data-source-bar" aria-live="polite">
        <div class="data-source-copy">
          <motion.span
            class="live-indicator"
            :animate="{ scale: [1, 1.42, 1], opacity: [1, 0.7, 1] }"
            :transition="{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }"
            aria-hidden="true"
          />
          <div>
            <strong>
              {{ weatherStore.isLoadingAll ? '현재 날씨를 갱신하는 중' : '현재 날씨 관측 정보' }}
            </strong>
            <small v-if="formattedLastUpdated">
              마지막 갱신 {{ formattedLastUpdated }}
            </small>
            <small v-else>전국 8개 도시의 현재 관측 정보</small>
          </div>
        </div>

        <button
          type="button"
          class="refresh-button"
          :disabled="weatherStore.isLoadingAll"
          @click="loadWeather(true)"
        >
          <motion.span
            :animate="weatherStore.isLoadingAll ? { rotate: 360 } : { rotate: 0 }"
            :transition="weatherStore.isLoadingAll
              ? { duration: 0.85, repeat: Infinity, ease: 'linear' }
              : { duration: 0.2 }"
            aria-hidden="true"
          >↻</motion.span>
          {{ weatherStore.isLoadingAll ? '갱신 중' : '새로고침' }}
        </button>
      </div>

      <p v-if="loadError" class="api-warning" role="alert">
        <span aria-hidden="true">!</span>
        {{ loadError }}
      </p>

      <div v-if="isInitialLoading" class="loading-grid" aria-busy="true">
        <div
          v-for="index in 4"
          :key="index"
          class="weather-skeleton"
          :class="{ 'weather-skeleton--featured': index === 1 }"
        >
          <span></span>
          <div>
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>
      </div>

      <div class="weather-list">
        <WeatherCard
          v-for="(city, index) in filteredWeatherList"
          :key="city.id"
          :city="city"
          :selected="selectedCityInfo?.id === city.id"
          :reveal-delay="Math.min(index * 0.055, 0.28)"
          :featured="!trimmedSearchQuery && (index === 0 || index === 5)"
          @select-card="selectCity"
          @click-detail="openDetail"
        />

        <div
          v-if="!isInitialLoading && weatherList.length === 0"
          class="api-empty"
          role="status"
        >
          <span aria-hidden="true">🌦️</span>
          <strong>실시간 날씨를 표시할 수 없습니다.</strong>
          <p>API 설정과 네트워크 연결을 확인한 후 다시 시도해 주세요.</p>
          <button type="button" @click="loadWeather(true)">다시 시도</button>
        </div>

        <p
          v-else-if="!isInitialLoading && filteredWeatherList.length === 0"
          class="empty-result"
          role="status"
        >
          “{{ trimmedSearchQuery }}”에 해당하는 도시가 없습니다.
        </p>
      </div>
    </BaseDashboardCard>

    <motion.p
      :key="selectedCityInfo?.id ?? 'empty'"
      class="selection-status"
      :initial="{ opacity: 0, y: 8, scale: 0.99 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ type: 'spring', stiffness: 330, damping: 25 }"
      aria-live="polite"
    >
      <span class="selection-status__icon" aria-hidden="true">
        {{ selectedCityInfo ? '✓' : '✦' }}
      </span>
      <template v-if="selectedCityInfo">
        <span>
          <strong>{{ selectedCityInfo.name }}</strong>{{ selectedCityParticle }} 선택되었습니다.
        </span>
      </template>
      <template v-else-if="isInitialLoading">실시간 날씨를 불러오고 있습니다.</template>
      <template v-else>카드를 클릭하거나 검색해 보세요.</template>
    </motion.p>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  overflow: hidden;
  align-items: center;
  padding:
    148px max(20px, calc((100vw - 1160px) / 2))
    112px;
  color: #ffffff;
  background: linear-gradient(135deg, #263130, #1e292a);
  grid-template-columns: minmax(0, 1fr) minmax(210px, 0.34fr);
  transition: background 900ms ease;
  isolation: isolate;
}

.home-hero::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(8 17 20 / 67%) 0%, rgb(8 17 20 / 14%) 74%),
    linear-gradient(to top, rgb(8 17 20 / 50%), transparent 45%);
  content: '';
}

.home-hero--clear {
  background:
    radial-gradient(circle at 76% 23%, #f6c979 0%, #ed9b68 16%, transparent 32%),
    linear-gradient(145deg, #2d6580 0%, #4b91a5 45%, #de8a61 100%);
}

.home-hero--clouds {
  background:
    radial-gradient(circle at 78% 20%, rgb(231 188 149 / 40%), transparent 27%),
    linear-gradient(145deg, #3c5259 0%, #718084 48%, #9a8a80 100%);
}

.home-hero--rain {
  background:
    radial-gradient(circle at 82% 18%, rgb(113 149 171 / 32%), transparent 29%),
    linear-gradient(145deg, #142630 0%, #294451 49%, #4d626b 100%);
}

.home-hero--snow {
  background:
    radial-gradient(circle at 80% 18%, rgb(255 255 255 / 50%), transparent 26%),
    linear-gradient(145deg, #526d78 0%, #8da5ae 52%, #bdc7c8 100%);
}

.home-hero--fog,
.home-hero--loading {
  background: linear-gradient(145deg, #354243 0%, #717b79 50%, #a29b91 100%);
}

.weather-scene {
  position: absolute;
  z-index: -2;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.scene-sun {
  position: absolute;
  top: 14%;
  right: 13%;
  width: clamp(180px, 25vw, 340px);
  height: clamp(180px, 25vw, 340px);
  border-radius: 50%;
  background: rgb(255 219 140 / 75%);
  box-shadow:
    0 0 70px rgb(255 199 104 / 52%),
    0 0 160px rgb(255 190 90 / 30%);
  opacity: 0;
  animation: sun-pulse 5s ease-in-out infinite alternate;
}

.home-hero--clear .scene-sun {
  opacity: 1;
}

.scene-cloud {
  position: absolute;
  width: 250px;
  height: 72px;
  border-radius: 999px;
  background: rgb(226 234 233 / 24%);
  box-shadow:
    62px -38px 0 12px rgb(226 234 233 / 20%),
    132px -15px 0 1px rgb(226 234 233 / 16%);
  opacity: 0;
  filter: blur(3px);
}

.scene-cloud--one {
  top: 29%;
  right: 11%;
  animation: cloud-drift 13s ease-in-out infinite alternate;
}

.scene-cloud--two {
  top: 55%;
  right: 34%;
  transform: scale(0.7);
  animation: cloud-drift 17s -5s ease-in-out infinite alternate-reverse;
}

.home-hero--clouds .scene-cloud,
.home-hero--rain .scene-cloud,
.home-hero--snow .scene-cloud {
  opacity: 1;
}

.scene-rain {
  position: absolute;
  top: -12%;
  width: 1px;
  height: 82px;
  background: linear-gradient(transparent, rgb(206 231 244 / 72%));
  opacity: 0;
  transform: rotate(11deg);
}

.home-hero--rain .scene-rain {
  opacity: 0.65;
  animation: rain-fall linear infinite;
}

.scene-snow {
  position: absolute;
  top: -5%;
  border-radius: 50%;
  background: rgb(255 255 255 / 82%);
  opacity: 0;
}

.home-hero--snow .scene-snow {
  opacity: 0.88;
  animation: snow-fall linear infinite;
}

.scene-fog {
  position: absolute;
  right: -15%;
  left: -15%;
  height: 18%;
  border-radius: 50%;
  background: rgb(238 239 232 / 18%);
  filter: blur(18px);
  opacity: 0;
}

.scene-fog--one {
  top: 34%;
  animation: fog-drift 10s ease-in-out infinite alternate;
}

.scene-fog--two {
  top: 57%;
  animation: fog-drift 13s -4s ease-in-out infinite alternate-reverse;
}

.home-hero--fog .scene-fog {
  opacity: 1;
}

@keyframes sun-pulse {
  to { transform: scale(1.08); filter: brightness(1.08); }
}

@keyframes cloud-drift {
  to { translate: 80px 8px; }
}

@keyframes rain-fall {
  to { translate: -80px 125vh; }
}

@keyframes snow-fall {
  to { translate: 60px 110vh; rotate: 180deg; }
}

@keyframes fog-drift {
  to { translate: 9% 2%; }
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 780px;
}

.hero-eyebrow {
  margin: 0 0 23px;
  color: #f0a47e;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.hero-copy h2 {
  margin: 0;
  font-family: 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif;
  font-size: clamp(2.6rem, 5.9vw, 5rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.065em;
}

.hero-copy h2 > span,
.hero-copy h2 em {
  display: block;
}

.hero-copy h2 em {
  color: #f4d9ca;
  font-style: normal;
}

.hero-description {
  max-width: 650px;
  margin: 25px 0 0;
  color: rgb(255 255 255 / 68%);
  font-size: 0.77rem;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.hero-cta {
  display: inline-flex;
  min-height: 47px;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 10px 21px;
  border: 1px solid rgb(255 255 255 / 54%);
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  text-decoration: none;
  transition:
    transform 170ms ease,
    background 170ms ease;
}

.hero-cta:hover,
.hero-cta:focus-visible {
  outline: none;
  transform: translateY(-2px);
}

.hero-cta--primary {
  border-color: #ed7c52;
  background: #ed7c52;
}

.hero-cta--primary:hover,
.hero-cta--primary:focus-visible {
  background: #df6b44;
}

.hero-cta--secondary:hover,
.hero-cta--secondary:focus-visible {
  background: rgb(255 255 255 / 10%);
}

.hero-weather {
  position: relative;
  z-index: 1;
  align-self: end;
  margin-bottom: 54px;
  padding: 19px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 2px;
  background: rgb(255 255 255 / 8%);
  backdrop-filter: blur(13px);
  box-shadow: 0 22px 50px rgb(10 20 23 / 18%);
}

.hero-weather__topline {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(255 255 255 / 58%);
  font-size: 0.49rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.hero-weather__topline span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #78c49e;
  box-shadow: 0 0 0 4px rgb(120 196 158 / 15%);
}

.hero-weather > strong {
  display: block;
  margin-top: 19px;
  font-size: 1rem;
}

.hero-weather > p {
  margin: 3px 0 0;
  color: rgb(255 255 255 / 67%);
  font-size: 0.67rem;
}

.hero-weather__temperature {
  display: block;
  margin-top: 15px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 3.2rem;
  font-weight: 400;
  line-height: 1;
}

.hero-weather > small {
  display: block;
  margin-top: 10px;
  color: rgb(255 255 255 / 51%);
  font-size: 0.51rem;
  line-height: 1.5;
}

.hero-flow {
  position: absolute;
  right: max(210px, calc((100vw - 1160px) / 2 + 210px));
  bottom: 32px;
  left: max(20px, calc((100vw - 1160px) / 2));
  display: flex;
  gap: 26px;
  padding-top: 16px;
  border-top: 1px solid rgb(255 255 255 / 17%);
}

.scroll-cue {
  position: absolute;
  right: max(20px, calc((100vw - 1160px) / 2));
  bottom: 26px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(255 255 255 / 62%);
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.scroll-cue i {
  position: relative;
  width: 34px;
  height: 34px;
  border: 1px solid rgb(255 255 255 / 36%);
  border-radius: 50%;
}

.scroll-cue i::after {
  position: absolute;
  top: 10px;
  left: 14px;
  width: 5px;
  height: 5px;
  border-right: 1px solid #ffffff;
  border-bottom: 1px solid #ffffff;
  content: '';
  transform: rotate(45deg);
  animation: scroll-arrow 1.4s ease-in-out infinite;
}

@keyframes scroll-arrow {
  50% { translate: 0 5px; opacity: 0.45; }
}

.hero-flow span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(255 255 255 / 58%);
  font-size: 0.58rem;
}

.hero-flow b {
  color: #ef9670;
  font-size: 0.52rem;
}

.story-section {
  position: relative;
  display: grid;
  width: min(100% - 40px, 1160px);
  min-height: 78svh;
  align-items: center;
  gap: clamp(30px, 6.5vw, 86px);
  margin: 0 auto;
  padding: clamp(84px, 11vw, 148px) 0;
  grid-template-columns: 54px minmax(0, 1.18fr) minmax(280px, 0.82fr);
}

.story-number {
  align-self: start;
  padding-top: 9px;
  color: #dc6b46;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
}

.story-copy {
  max-width: 610px;
}

.story-copy > p {
  margin: 0 0 22px;
  color: #d96c47;
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.story-copy h2 {
  margin: 0;
  color: #1f2a2b;
  font-family: 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif;
  font-size: clamp(2.15rem, 4.6vw, 4.1rem);
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: -0.065em;
  text-wrap: balance;
}

.story-copy > span {
  display: block;
  max-width: 530px;
  margin-top: 28px;
  color: #6d7471;
  font-size: 0.75rem;
  line-height: 1.9;
}

.story-weather-orbit {
  position: relative;
  display: grid;
  width: min(30vw, 330px);
  aspect-ratio: 1;
  place-content: center;
  justify-self: center;
  overflow: hidden;
  border-radius: 50%;
  color: #ffffff;
  background: linear-gradient(145deg, #426f7b, #d8835c);
  box-shadow: 0 34px 70px rgb(43 50 48 / 17%);
  text-align: center;
  isolation: isolate;
}

.story-weather-orbit::before {
  position: absolute;
  z-index: -1;
  inset: 17%;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 50%;
  content: '';
}

.story-weather-orbit--clouds {
  background: linear-gradient(145deg, #64777a, #a89588);
}

.story-weather-orbit--rain {
  background: linear-gradient(145deg, #203b49, #667b85);
}

.story-weather-orbit--snow {
  background: linear-gradient(145deg, #6e8994, #c4cbca);
}

.story-weather-orbit--fog,
.story-weather-orbit--loading {
  background: linear-gradient(145deg, #53615f, #a9a297);
}

.story-weather-orbit > span,
.story-weather-orbit > small {
  position: relative;
  z-index: 1;
  color: rgb(255 255 255 / 66%);
  font-size: 0.57rem;
  font-weight: 700;
}

.story-weather-orbit > strong {
  position: relative;
  z-index: 1;
  margin: 8px 0 4px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(3.4rem, 7vw, 5.4rem);
  font-weight: 400;
  line-height: 1;
}

.story-weather-orbit > i {
  position: absolute;
  inset: 7%;
  border: 1px dashed rgb(255 255 255 / 32%);
  border-radius: 50%;
  animation: orbit-turn 24s linear infinite;
}

.story-weather-orbit > i::after {
  position: absolute;
  top: 11%;
  right: 9%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #f3ab82;
  box-shadow: 0 0 0 6px rgb(243 171 130 / 16%);
  content: '';
}

@keyframes orbit-turn {
  to { transform: rotate(360deg); }
}

.story-section--drive {
  width: 100%;
  max-width: none;
  padding-inline: max(20px, calc((100vw - 1160px) / 2));
  color: #ffffff;
  background:
    radial-gradient(circle at 85% 18%, rgb(236 127 84 / 15%), transparent 28%),
    #182020;
}

.story-section--drive .story-number,
.story-section--drive .story-copy > p {
  color: #ef906b;
}

.story-section--drive .story-copy h2 {
  color: #f7f2e9;
}

.story-section--drive .story-copy > span {
  color: rgb(255 255 255 / 58%);
}

.drive-timeline {
  display: flex;
  align-items: center;
  justify-content: center;
}

.drive-timeline > span {
  display: grid;
  flex: 0 0 auto;
  width: clamp(68px, 8vw, 96px);
  aspect-ratio: 1;
  place-content: center;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 50%;
  color: rgb(255 255 255 / 60%);
  text-align: center;
  transition: 180ms ease;
}

.drive-timeline > span b {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.3rem, 2.6vw, 2rem);
  font-weight: 400;
}

.drive-timeline > span small {
  margin-top: 1px;
  font-size: 0.45rem;
  letter-spacing: 0.14em;
}

.drive-timeline > span.is-active {
  border-color: #ed7c52;
  color: #ffffff;
  background: #ed7c52;
  box-shadow: 0 18px 36px rgb(237 124 82 / 20%);
  transform: scale(1.08);
}

.drive-timeline > i {
  width: clamp(18px, 2vw, 34px);
  height: 1px;
  background: rgb(255 255 255 / 24%);
}

.story-cta {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  gap: 25px;
  margin-top: 30px;
  padding: 10px 21px;
  border-radius: 999px;
  color: #ffffff;
  background: #e6724c;
  font-size: 0.67rem;
  font-weight: 800;
  text-decoration: none;
  transition:
    transform 170ms ease,
    background 170ms ease;
}

.story-cta:hover,
.story-cta:focus-visible {
  outline: none;
  background: #d9613a;
  transform: translateY(-2px);
}

.event-preview {
  display: grid;
  gap: 9px;
  width: min(100%, 390px);
  justify-self: end;
}

.event-preview article {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 22px 24px;
  border: 1px solid #ddd8ce;
  background: rgb(255 255 255 / 54%);
  transition:
    transform 180ms ease,
    border-color 180ms ease;
}

.event-preview article::after {
  position: absolute;
  top: 23px;
  right: 21px;
  color: #dc6b46;
  content: '↗';
  font-size: 0.9rem;
}

.event-preview article:nth-child(2) {
  margin-left: 42px;
}

.event-preview article:hover {
  border-color: #d47b5b;
  transform: translateX(-5px);
}

.event-preview span {
  color: #db744e;
  font-size: 0.47rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.event-preview strong {
  color: #263231;
  font-family: 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif;
  font-size: 1.23rem;
  font-weight: 500;
}

.event-preview small {
  color: #7f8581;
  font-size: 0.59rem;
}

.home-view > :deep(.dashboard-card) {
  width: min(100% - 40px, 1160px);
  margin: 24px auto 0;
}

#city-weather {
  scroll-margin-top: 18px;
}

.data-source-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid #dceaf3;
  border-radius: 14px;
  background: rgb(255 255 255 / 82%);
}

.data-source-copy {
  display: flex;
  align-items: center;
  gap: 10px;
}

.data-source-copy div {
  display: grid;
  gap: 2px;
}

.data-source-copy strong {
  color: #31536d;
  font-size: 0.78rem;
}

.data-source-copy small {
  color: #8699aa;
  font-size: 0.65rem;
}

.live-indicator {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #36bd80;
  box-shadow: 0 0 0 5px rgb(54 189 128 / 13%);
}

.refresh-button,
.api-empty button {
  display: inline-flex;
  flex: none;
  min-height: 35px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 11px;
  border: 1px solid #c8dce9;
  border-radius: 10px;
  color: #397392;
  background: #f6fbfe;
  font-size: 0.7rem;
  font-weight: 800;
}

.refresh-button:hover,
.refresh-button:focus-visible,
.api-empty button:hover,
.api-empty button:focus-visible {
  border-color: #4aa8dd;
  color: #176d9f;
  background: #eaf7ff;
  outline: none;
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.api-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 13px;
  padding: 10px 12px;
  border: 1px solid #f4d7b3;
  border-radius: 12px;
  color: #9a612d;
  background: #fff8ed;
  font-size: 0.72rem;
  font-weight: 700;
}

.api-warning span {
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  background: #e8a351;
  font-size: 0.66rem;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.weather-skeleton {
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 172px;
  padding: 20px;
  border: 1px solid #e0ebf3;
  border-radius: 17px;
  background: rgb(255 255 255 / 82%);
}

.weather-skeleton--featured {
  grid-column: span 2;
  min-height: 210px;
}

.weather-skeleton > span {
  width: 52px;
  height: 52px;
  border-radius: 16px;
}

.weather-skeleton div {
  display: grid;
  flex: 1;
  gap: 9px;
}

.weather-skeleton i,
.weather-skeleton > span {
  display: block;
  background: linear-gradient(90deg, #edf3f7, #f8fbfd, #edf3f7);
  background-size: 200% 100%;
  animation: loading 1.3s ease-in-out infinite;
}

.weather-skeleton i {
  width: 78%;
  height: 10px;
  border-radius: 999px;
}

.weather-skeleton i:nth-child(2) {
  width: 55%;
  height: 15px;
}

.weather-skeleton i:nth-child(3) {
  width: 64%;
}

@keyframes loading {
  to {
    background-position: -200% 0;
  }
}

.weather-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: 12px;
}

.api-empty {
  grid-column: 1 / -1;
  display: grid;
  justify-items: center;
  padding: 36px 18px;
  border: 1px dashed #b9d2e5;
  border-radius: 16px;
  color: #6d7b8d;
  background: rgb(255 255 255 / 82%);
  text-align: center;
}

.api-empty > span {
  margin-bottom: 8px;
  font-size: 2rem;
}

.api-empty strong {
  color: #3e5c73;
  font-size: 0.9rem;
}

.api-empty p {
  margin: 7px 0 14px;
  font-size: 0.75rem;
}

.empty-result {
  grid-column: 1 / -1;
  margin: 0;
  padding: 34px 16px;
  border: 1px dashed #b9d2e5;
  border-radius: 16px;
  color: #6d7b8d;
  background: rgb(255 255 255 / 82%);
  text-align: center;
}

.selection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: min(100% - 40px, 1160px);
  margin: 18px auto 0;
  padding: 14px 16px;
  border: 1px solid #c9ebdb;
  border-radius: 14px;
  color: #23825b;
  background: linear-gradient(135deg, #ebfaf3, #e7f8ef);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

.selection-status__icon {
  display: grid;
  flex: 0 0 auto;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  background: #3dbb82;
  font-size: 0.72rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .home-hero {
    min-height: 100svh;
    align-content: center;
    padding: 112px 24px 100px;
    grid-template-columns: 1fr;
  }

  .hero-weather {
    width: min(100%, 260px);
    align-self: auto;
    margin: 28px 0 36px auto;
  }

  .hero-flow {
    right: 90px;
    left: 24px;
    flex-wrap: wrap;
    gap: 9px 20px;
  }

  .scroll-cue {
    right: 24px;
  }

  .scroll-cue span {
    display: none;
  }

  .story-section {
    width: min(100% - 40px, 680px);
    min-height: auto;
    gap: 30px 24px;
    padding: 92px 0;
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .story-section > :last-child {
    width: min(100%, 360px);
    margin-top: 14px;
    grid-column: 2;
    justify-self: start;
  }

  .story-section--drive {
    width: 100%;
    padding-inline: 20px;
  }

  .story-weather-orbit {
    width: min(68vw, 310px);
  }

  .event-preview article:nth-child(2) {
    margin-left: 30px;
  }

  .weather-list,
  .loading-grid {
    grid-template-columns: 1fr;
  }

  .weather-skeleton--featured {
    grid-column: auto;
  }
}

@media (max-width: 480px) {
  .home-hero {
    min-height: 100svh;
    align-content: start;
    padding: 108px 18px 88px;
  }

  .hero-copy h2 {
    font-size: clamp(2.05rem, 10vw, 2.8rem);
  }

  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-cta {
    width: 100%;
  }

  .hero-weather {
    width: 100%;
    margin: 22px 0 50px;
  }

  .hero-flow {
    right: 18px;
    bottom: 20px;
    left: 18px;
    gap: 8px 13px;
  }

  .hero-flow span {
    font-size: 0.52rem;
  }

  .scroll-cue {
    display: none;
  }

  .story-section {
    width: min(100% - 28px, 460px);
    gap: 18px;
    padding: 76px 0;
    grid-template-columns: 1fr;
  }

  .story-number,
  .story-section > :last-child {
    grid-column: 1;
  }

  .story-copy h2 {
    font-size: clamp(2rem, 11vw, 3rem);
  }

  .story-copy > span {
    margin-top: 21px;
  }

  .story-section--drive {
    width: 100%;
    padding-inline: 14px;
  }

  .drive-timeline > span {
    width: clamp(62px, 23vw, 82px);
  }

  .event-preview article:nth-child(2) {
    margin-left: 0;
  }

  .home-view > :deep(.dashboard-card),
  .selection-status {
    width: min(100% - 28px, 460px);
  }

  .data-source-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-sun,
  .scene-cloud,
  .scene-rain,
  .scene-snow,
  .scene-fog,
  .scroll-cue i::after,
  .story-weather-orbit > i {
    animation: none;
  }
}
</style>
