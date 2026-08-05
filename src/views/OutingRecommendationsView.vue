<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { cityDefinitions } from '../data/weather'
import {
  fetchOutingRecommendations,
  getOutingApiErrorMessage,
  isTourApiConfigured,
} from '../services/outingsApi'
import { useConfigStore } from '../stores/configStore'
import { useMemberStore } from '../stores/memberStore'
import { getWeatherEmoji } from '../utils/weatherPresentation'

const originStorageKey = 'weather-dashboard-outing-origin'
const configStore = useConfigStore()
const memberStore = useMemberStore()

// 마지막으로 선택한 출발 도시를 브라우저에서 읽는다.
const readSavedOriginId = () => {
  try {
    return localStorage.getItem(originStorageKey)
  } catch {
    return null
  }
}

const memberCity = cityDefinitions.find(
  (city) => city.name === memberStore.member?.favoriteCity,
)
const savedOrigin = cityDefinitions.find(
  (city) => city.id === readSavedOriginId(),
)
const selectedOriginId = ref(
  savedOrigin?.id ?? memberCity?.id ?? cityDefinitions[0].id,
)
const currentLocation = ref(null)
const maxDriveMinutes = ref(120)
const spaceFilter = ref('전체')
const recommendations = ref([])
const isLoading = ref(false)
const isLocating = ref(false)
const errorMessage = ref('')
const locationMessage = ref('')
const lastUpdated = ref(null)

const selectedCity = computed(
  () =>
    cityDefinitions.find((city) => city.id === selectedOriginId.value) ??
    cityDefinitions[0],
)

const origin = computed(() => currentLocation.value ?? selectedCity.value)
const originLabel = computed(() => origin.value.name)

// 사용자가 고른 실내·야외 조건에 맞는 결과만 화면에 표시한다.
const filteredRecommendations = computed(() => {
  if (spaceFilter.value === '실내') {
    return recommendations.value.filter((event) => event.isIndoor)
  }
  if (spaceFilter.value === '야외') {
    return recommendations.value.filter((event) => !event.isIndoor)
  }
  return recommendations.value
})

const indoorCount = computed(
  () => recommendations.value.filter((event) => event.isIndoor).length,
)

const closestEvent = computed(() => {
  if (!recommendations.value.length) return null
  return recommendations.value.reduce((current, event) =>
    event.driveMinutes < current.driveMinutes ? event : current,
  )
})

const bestWeatherEvent = computed(() => {
  if (!recommendations.value.length) return null
  return recommendations.value.reduce((current, event) =>
    event.weatherScore > current.weatherScore ? event : current,
  )
})

const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(lastUpdated.value)
})

const formatTemperature = (temperature) => {
  if (!Number.isFinite(Number(temperature))) return '확인 중'
  if (configStore.unit === 'fahrenheit') {
    return `${Math.round((temperature * 9) / 5 + 32)}°F`
  }
  return `${temperature}°C`
}

const formatEventDate = (dateText) => {
  if (!dateText || dateText.length !== 8) return '일정 확인 필요'
  const date = new Date(
    Number(dateText.slice(0, 4)),
    Number(dateText.slice(4, 6)) - 1,
    Number(dateText.slice(6, 8)),
  )
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const getMapUrl = (event) =>
  `https://map.naver.com/p/search/${encodeURIComponent(`${event.title} ${event.address}`)}`

const getScoreType = (score) => {
  if (score >= 80) return 'success'
  if (score >= 65) return 'warning'
  return 'info'
}

// 선택한 출발지와 최대 이동시간을 기준으로 추천 목록을 다시 요청한다.
const loadRecommendations = async () => {
  if (!isTourApiConfigured || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    recommendations.value = await fetchOutingRecommendations({
      origin: origin.value,
      maxDriveMinutes: maxDriveMinutes.value,
    })
    lastUpdated.value = new Date()
  } catch (error) {
    recommendations.value = []
    errorMessage.value = getOutingApiErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const useSelectedCity = () => {
  currentLocation.value = null
  locationMessage.value = ''
  loadRecommendations()
}

// 위치 사용을 허용하면 도시 좌표 대신 현재 GPS 좌표를 출발지로 사용한다.
const useCurrentLocation = () => {
  if (!navigator.geolocation) {
    locationMessage.value = '이 브라우저에서는 현재 위치를 사용할 수 없습니다.'
    return
  }

  isLocating.value = true
  locationMessage.value = ''

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      currentLocation.value = {
        id: 'current_location',
        name: '내 현재 위치',
        latitude: coords.latitude,
        longitude: coords.longitude,
      }
      isLocating.value = false
      loadRecommendations()
    },
    (error) => {
      const messages = {
        1: '현재 위치 사용이 허용되지 않았습니다. 도시를 직접 선택해 주세요.',
        2: '현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        3: '위치 확인 시간이 초과되었습니다. 도시를 직접 선택해 주세요.',
      }
      locationMessage.value =
        messages[error.code] ?? '현재 위치를 확인하지 못했습니다.'
      isLocating.value = false
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  )
}

// 출발 도시가 바뀔 때 다음 방문에서도 사용할 수 있도록 저장한다.
watch(selectedOriginId, (cityId) => {
  try {
    localStorage.setItem(originStorageKey, cityId)
  } catch {
    // 저장소 사용이 제한된 환경에서도 도시 선택 기능은 그대로 유지한다.
  }
})

onMounted(() => {
  if (isTourApiConfigured) loadRecommendations()
})
</script>

<template>
  <section class="outing-view" aria-labelledby="outing-heading">
    <motion.div
      class="outing-hero"
      :initial="{ opacity: 0, y: 18 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <div>
        <p>오늘 어디 갈까?</p>
        <h2 id="outing-heading">날씨에 맞는 나들이 장소</h2>
        <span>현재 진행 중인 행사 중 차로 2시간 안에 갈 수 있는 곳을 찾습니다.</span>
      </div>
      <span class="outing-hero__icon" aria-hidden="true">↗</span>
    </motion.div>

    <el-card class="outing-controls" shadow="never">
      <div class="control-grid">
        <label class="control-field">
          <span>출발 위치</span>
          <el-select
            v-model="selectedOriginId"
            :disabled="isLoading"
            @change="useSelectedCity"
          >
            <el-option
              v-for="city in cityDefinitions"
              :key="city.id"
              :label="city.name"
              :value="city.id"
            />
          </el-select>
        </label>

        <label class="control-field">
          <span>최대 운전시간</span>
          <el-select
            v-model="maxDriveMinutes"
            :disabled="isLoading"
            @change="loadRecommendations"
          >
            <el-option label="1시간" :value="60" />
            <el-option label="1시간 30분" :value="90" />
            <el-option label="2시간" :value="120" />
          </el-select>
        </label>

        <div class="control-actions">
          <el-button
            :loading="isLocating"
            :disabled="isLoading"
            @click="useCurrentLocation"
          >
            현재 위치 사용
          </el-button>
          <el-button
            type="primary"
            :loading="isLoading"
            :disabled="!isTourApiConfigured"
            @click="loadRecommendations"
          >
            다시 추천받기
          </el-button>
        </div>
      </div>

      <p class="origin-note">
        <span aria-hidden="true"></span>
        현재 출발지는 <strong>{{ originLabel }}</strong>입니다. 위치 정보는 추천 계산에만 사용합니다.
      </p>
      <el-alert
        v-if="locationMessage"
        class="location-alert"
        type="warning"
        show-icon
        :closable="false"
        :title="locationMessage"
      />
    </el-card>

    <el-alert
      v-if="!isTourApiConfigured"
      class="outing-alert"
      type="warning"
      show-icon
      :closable="false"
      title="행사 정보 연결이 필요합니다"
      description="TourAPI 인증키를 설정하면 현재 진행 중인 전국 행사와 전시를 불러올 수 있습니다."
    />

    <el-alert
      v-else-if="errorMessage"
      class="outing-alert"
      type="error"
      show-icon
      :closable="false"
      :title="errorMessage"
    />

    <div v-if="isLoading" class="outing-loading">
      <el-card v-for="index in 4" :key="index" shadow="never">
        <el-skeleton :rows="5" animated />
      </el-card>
    </div>

    <template v-else-if="recommendations.length">
      <div class="outing-summary">
        <el-card shadow="never">
          <small>추천 가능한 일정</small>
          <strong>{{ recommendations.length }}곳</strong>
          <span>{{ formattedLastUpdated }} 기준</span>
        </el-card>
        <el-card shadow="never">
          <small>가장 가까운 곳</small>
          <strong>{{ closestEvent?.driveMinutes }}분</strong>
          <span>{{ closestEvent?.title }}</span>
        </el-card>
        <el-card shadow="never">
          <small>날씨 점수 1위</small>
          <strong>{{ bestWeatherEvent?.weatherScore }}점</strong>
          <span>{{ bestWeatherEvent?.title }}</span>
        </el-card>
        <el-card shadow="never">
          <small>실내 일정</small>
          <strong>{{ indoorCount }}곳</strong>
          <span>비가 오면 실내 행사 우선</span>
        </el-card>
      </div>

      <div class="result-toolbar">
        <div>
          <strong>{{ originLabel }}에서 출발</strong>
          <span>날씨와 이동시간 점수순으로 정렬합니다.</span>
        </div>
        <el-radio-group v-model="spaceFilter" size="small">
          <el-radio-button value="전체">전체</el-radio-button>
          <el-radio-button value="실내">실내</el-radio-button>
          <el-radio-button value="야외">야외</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="filteredRecommendations.length" class="outing-grid">
        <motion.article
          v-for="(event, index) in filteredRecommendations"
          :key="event.id"
          class="outing-card"
          :initial="{ opacity: 0, y: 16 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.38, delay: Math.min(index * 0.045, 0.25) }"
          :while-hover="{ y: -4 }"
        >
          <div class="event-image" :class="{ 'event-image--empty': !event.imageUrl }">
            <img
              v-if="event.imageUrl"
              :src="event.imageUrl"
              :alt="`${event.title} 행사 이미지`"
              loading="lazy"
            />
            <span v-else aria-hidden="true">🎪</span>
            <div class="event-score">
              <small>추천</small>
              <strong>{{ event.recommendationScore }}</strong>
            </div>
          </div>

          <div class="event-content">
            <div class="event-tags">
              <el-tag size="small" effect="plain">{{ event.type }}</el-tag>
              <el-tag
                size="small"
                :type="event.isIndoor ? 'success' : 'warning'"
                effect="light"
              >
                {{ event.isIndoor ? '실내' : '야외' }}
              </el-tag>
              <el-tag
                size="small"
                :type="getScoreType(event.weatherScore)"
                effect="light"
              >
                날씨 {{ event.weatherScore }}점
              </el-tag>
            </div>

            <h3>{{ event.title }}</h3>
            <p class="event-address">{{ event.address || '행사 장소 확인 필요' }}</p>

            <div class="event-facts">
              <div>
                <span aria-hidden="true">🚗</span>
                <strong>{{ event.driveMinutes }}분</strong>
                <small>{{ event.driveDistanceKm }}km</small>
              </div>
              <div>
                <span aria-hidden="true">{{ getWeatherEmoji(event.weather?.status) }}</span>
                <strong>{{ formatTemperature(event.weather?.temp) }}</strong>
                <small>{{ event.weather?.status ?? '날씨 확인 중' }}</small>
              </div>
            </div>

            <p class="recommendation-reason">{{ event.recommendationReason }}</p>

            <footer class="event-footer">
              <span>
                {{ formatEventDate(event.eventStart) }}–{{ formatEventDate(event.eventEnd) }}
              </span>
              <a :href="getMapUrl(event)" target="_blank" rel="noopener noreferrer">
                지도에서 보기 →
              </a>
            </footer>
          </div>
        </motion.article>
      </div>

      <el-empty v-else description="선택한 유형의 추천 장소가 없습니다." />
    </template>

    <el-card
      v-else-if="isTourApiConfigured && !errorMessage"
      class="outing-empty"
      shadow="never"
    >
      <el-empty description="선택한 시간 안에 방문할 수 있는 진행 중 행사를 찾지 못했습니다.">
        <el-button type="primary" @click="loadRecommendations">다시 찾아보기</el-button>
      </el-empty>
    </el-card>

    <p class="data-source-note">
      행사 정보는 한국관광공사 TourAPI, 날씨는 OpenWeatherMap을 사용합니다.
      이동시간은 OpenStreetMap 기반 OSRM 예상치이며 실시간 교통상황은 반영하지 않습니다.
    </p>
  </section>
</template>

<style scoped>
.outing-view {
  padding-top: 24px;
}

.outing-hero {
  display: flex;
  min-height: 292px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: clamp(28px, 6vw, 54px);
  border-radius: 4px;
  color: #ffffff;
  background:
    radial-gradient(circle at 85% 20%, rgb(237 124 82 / 34%), transparent 28%),
    linear-gradient(135deg, #1f2b2c, #3b4441);
  box-shadow: 0 22px 55px rgb(31 43 44 / 17%);
}

.outing-hero p {
  margin: 0 0 5px;
  color: #ef9e78;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.15em;
}

.outing-hero h2 {
  margin: 0;
  font-family: 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif;
  font-size: clamp(2rem, 5.5vw, 3.8rem);
  font-weight: 400;
  line-height: 1.22;
  letter-spacing: -0.06em;
  text-wrap: balance;
}

.outing-hero div > span {
  display: block;
  margin-top: 9px;
  color: rgb(255 255 255 / 65%);
  font-size: 0.76rem;
}

.outing-hero__icon {
  display: grid;
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 36%);
  border-radius: 50%;
  background: #ed7c52;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
}

.outing-controls {
  margin-top: 15px;
  border-color: rgb(31 42 43 / 14%);
  border-radius: 4px;
  background: rgb(255 255 255 / 68%);
}

.outing-controls :deep(.el-card__body) {
  padding: 21px;
}

.outing-controls :deep(.el-button--primary),
.outing-empty :deep(.el-button--primary) {
  border-color: #ed7c52;
  background: #ed7c52;
}

.outing-controls :deep(.el-button--primary:hover),
.outing-empty :deep(.el-button--primary:hover) {
  border-color: #df6b44;
  background: #df6b44;
}

.control-grid {
  display: grid;
  align-items: end;
  gap: 12px;
  grid-template-columns: minmax(150px, 1fr) minmax(145px, 0.75fr) auto;
}

.control-field {
  display: grid;
  gap: 7px;
}

.control-field > span {
  color: #4d677c;
  font-size: 0.68rem;
  font-weight: 800;
}

.control-field :deep(.el-select) {
  width: 100%;
}

.control-actions {
  display: flex;
  gap: 7px;
}

.origin-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 12px 0 0;
  color: #74899b;
  font-size: 0.64rem;
}

.origin-note > span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #3abd86;
  box-shadow: 0 0 0 4px rgb(58 189 134 / 12%);
}

.origin-note strong {
  color: #39738e;
}

.location-alert,
.outing-alert {
  margin-top: 12px;
}

.outing-loading,
.outing-grid {
  display: grid;
  gap: 13px;
  margin-top: 15px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.outing-loading :deep(.el-card),
.outing-empty {
  border-color: rgb(31 42 43 / 14%);
  border-radius: 4px;
}

.outing-summary {
  display: grid;
  gap: 10px;
  margin-top: 15px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.outing-summary :deep(.el-card) {
  border-color: rgb(31 42 43 / 13%);
  border-radius: 4px;
  background: rgb(255 255 255 / 65%);
}

.outing-summary :deep(.el-card__body) {
  display: grid;
  gap: 4px;
  padding: 14px;
}

.outing-summary small {
  color: #8091a1;
  font-size: 0.58rem;
}

.outing-summary strong {
  overflow: hidden;
  color: #263332;
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outing-summary span {
  overflow: hidden;
  color: #788c9f;
  font-size: 0.55rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 19px;
}

.result-toolbar > div {
  display: grid;
  gap: 3px;
}

.result-toolbar strong {
  color: #263332;
  font-size: 0.78rem;
}

.result-toolbar span {
  color: #8193a2;
  font-size: 0.6rem;
}

.outing-card {
  overflow: hidden;
  border: 1px solid rgb(31 42 43 / 13%);
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(31 43 44 / 7%);
}

.event-image {
  position: relative;
  height: 154px;
  overflow: hidden;
  background: #eaf5fb;
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-image--empty {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 74% 30%, rgb(255 215 118 / 60%), transparent 24%),
    linear-gradient(145deg, #dff4f5, #e5f1ff);
  font-size: 3rem;
}

.event-score {
  position: absolute;
  top: 11px;
  right: 11px;
  display: grid;
  min-width: 50px;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: 13px;
  color: #ffffff;
  background: rgb(29 76 99 / 79%);
  text-align: center;
  backdrop-filter: blur(8px);
}

.event-score small {
  font-size: 0.47rem;
}

.event-score strong {
  font-size: 1rem;
  line-height: 1;
}

.event-content {
  padding: 16px;
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.event-content h3 {
  min-height: 44px;
  margin: 11px 0 5px;
  color: #263332;
  font-size: 0.94rem;
  line-height: 1.45;
  letter-spacing: -0.025em;
}

.event-address {
  min-height: 32px;
  margin: 0;
  color: #8293a2;
  font-size: 0.62rem;
  line-height: 1.5;
}

.event-facts {
  display: grid;
  gap: 8px;
  margin-top: 13px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.event-facts > div {
  display: grid;
  padding: 10px;
  border: 1px solid #e1edf4;
  border-radius: 12px;
  background: #f7fbfe;
  grid-template-columns: auto 1fr;
  column-gap: 7px;
}

.event-facts > div > span {
  grid-row: span 2;
  align-self: center;
}

.event-facts strong {
  color: #32617c;
  font-size: 0.74rem;
}

.event-facts small {
  overflow: hidden;
  color: #8093a2;
  font-size: 0.53rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-reason {
  min-height: 42px;
  margin: 11px 0 0;
  padding: 9px 10px;
  border-radius: 11px;
  color: #537487;
  background: #eff8f5;
  font-size: 0.61rem;
  line-height: 1.55;
}

.event-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid #e7eff5;
  color: #8193a3;
  font-size: 0.59rem;
}

.event-footer a {
  color: #d9653e;
  font-weight: 800;
  text-decoration: none;
}

.outing-empty {
  margin-top: 15px;
}

.data-source-note {
  margin: 16px 4px 0;
  color: #8a99a6;
  font-size: 0.56rem;
  line-height: 1.65;
  text-align: center;
}

@media (max-width: 760px) {
  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-actions {
    grid-column: 1 / -1;
  }

  .control-actions :deep(.el-button) {
    flex: 1;
    margin: 0;
  }

  .outing-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .outing-hero {
    min-height: 0;
    padding: 20px;
  }

  .outing-hero__icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    font-size: 1.8rem;
  }

  .outing-hero div > span {
    max-width: 240px;
    line-height: 1.5;
  }

  .control-grid,
  .outing-grid {
    grid-template-columns: 1fr;
  }

  .result-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .result-toolbar :deep(.el-radio-group) {
    display: flex;
  }

  .result-toolbar :deep(.el-radio-button) {
    flex: 1;
  }

  .result-toolbar :deep(.el-radio-button__inner) {
    width: 100%;
  }

  .event-image {
    height: 180px;
  }
}
</style>
