<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import { useTemperature } from '../composables/useTemperature'
import { findWeatherCity } from '../data/weather'
import { useWeatherStore } from '../stores/weatherStore'
import { getWeatherEmoji } from '../utils/weatherPresentation'

const route = useRoute()
const router = useRouter()
const weatherStore = useWeatherStore()

const cityId = computed(() => String(route.params.cityId))
const cityDefinition = computed(() => findWeatherCity(cityId.value))
const city = computed(() => weatherStore.getWeatherById(cityId.value))
const isLoading = computed(() => weatherStore.isCityLoading(cityId.value))
const detailError = computed(() => weatherStore.getCityError(cityId.value))

const rawTemperature = computed(() => city.value?.temp)
const rawFeelsLike = computed(() => city.value?.feelsLike)
const { displayTemp: displayTemperature, unitSymbol } =
  useTemperature(rawTemperature)
const { displayTemp: displayFeelsLike } = useTemperature(rawFeelsLike)

const weatherIcon = computed(() => getWeatherEmoji(city.value?.status))

const formatCityTime = (unixTimestamp) => {
  if (!unixTimestamp || !city.value) return '—'

  const cityTime = new Date(
    (unixTimestamp + city.value.timezone) * 1000,
  )

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(cityTime)
}

const loadDetail = async (force = false) => {
  if (!cityDefinition.value) return

  try {
    await weatherStore.loadCity(cityId.value, { force })
  } catch {
    // 요청 실패 메시지는 Store가 관리하므로 화면에서는 추가 예외를 발생시키지 않는다.
  }
}

watch(cityId, () => loadDetail(), { immediate: true })

const goHome = () => {
  router.push({ name: 'weather-home' })
}
</script>

<template>
  <section class="detail-view" aria-labelledby="detail-heading">
    <template v-if="cityDefinition">
      <div class="view-heading">
        <span class="view-heading__icon" aria-hidden="true">{{ weatherIcon }}</span>
        <div>
          <p>실시간 기상 관측</p>
          <h2 id="detail-heading">{{ cityDefinition.name }} 상세 날씨</h2>
        </div>
      </div>

      <div v-if="isLoading && !city" class="detail-loading" aria-busy="true">
        <span aria-hidden="true">🌦️</span>
        <strong>실시간 관측 정보를 불러오는 중입니다.</strong>
        <i></i>
      </div>

      <BaseDashboardCard
        v-else-if="city"
        title="지역별 상세 기상 관측 정보"
        icon="📊"
        heading-id="observation-heading"
      >
        <div class="weather-hero">
          <div>
            <span class="location-label">📍 {{ city.region }}</span>
            <p class="temperature">
              {{ displayTemperature }}<small>{{ unitSymbol }}</small>
            </p>
            <p class="condition">
              {{ city.description }} · 체감 {{ displayFeelsLike }}{{ unitSymbol }}
            </p>
          </div>
          <span class="weather-hero__icon" aria-hidden="true">{{ weatherIcon }}</span>
        </div>

        <dl class="detail-grid">
          <div>
            <dt>🌡️ 체감 온도</dt>
            <dd>{{ displayFeelsLike }}{{ unitSymbol }}</dd>
          </div>
          <div>
            <dt>💧 습도</dt>
            <dd>{{ city.humidity }}%</dd>
          </div>
          <div>
            <dt>🍃 풍속</dt>
            <dd>{{ city.windSpeed }}m/s</dd>
          </div>
          <div>
            <dt>🧭 기압</dt>
            <dd>{{ city.pressure }}hPa</dd>
          </div>
          <div>
            <dt>👀 가시거리</dt>
            <dd>{{ city.visibilityKm }}km</dd>
          </div>
          <div>
            <dt>☁️ 구름량</dt>
            <dd>{{ city.cloudiness }}%</dd>
          </div>
        </dl>

        <div class="observation-meta">
          <span>🌅 일출 {{ formatCityTime(city.sunrise) }}</span>
          <span>🌇 일몰 {{ formatCityTime(city.sunset) }}</span>
          <span>☔ 1시간 강수량 {{ city.rainLastHour }}mm</span>
        </div>

        <div class="source-notice">
          <p>
            <span aria-hidden="true"></span>
            OpenWeatherMap 실시간 관측 데이터
          </p>
          <button
            type="button"
            :disabled="isLoading"
            @click="loadDetail(true)"
          >
            ↻ {{ isLoading ? '갱신 중' : '새로고침' }}
          </button>
        </div>
      </BaseDashboardCard>

      <div v-else class="detail-error" role="alert">
        <span aria-hidden="true">⚠️</span>
        <strong>날씨 정보를 불러오지 못했습니다.</strong>
        <p>{{ detailError }}</p>
        <button type="button" @click="loadDetail(true)">다시 시도</button>
      </div>
    </template>

    <div v-else class="unknown-city" role="alert">
      <span aria-hidden="true">🧭</span>
      <p>등록되지 않은 도시</p>
      <h2 id="detail-heading">도시 정보를 찾을 수 없습니다.</h2>
      <p>요청한 도시 코드와 일치하는 날씨 데이터가 없습니다.</p>
    </div>

    <button type="button" class="back-button" @click="goHome">
      <span aria-hidden="true">←</span> 메인 대시보드로 돌아가기
    </button>
  </section>
</template>

<style scoped>
.detail-view {
  padding-top: 24px;
}

.detail-loading,
.detail-error {
  display: grid;
  justify-items: center;
  margin-top: 24px;
  padding: 54px 20px;
  border: 1px solid #dce9f3;
  border-radius: 20px;
  color: #71879a;
  background: linear-gradient(145deg, #f9fcfe, #f3f9fd);
  text-align: center;
}

.detail-loading > span,
.detail-error > span {
  margin-bottom: 12px;
  font-size: 2.4rem;
}

.detail-loading strong,
.detail-error strong {
  color: #3d5e76;
  font-size: 0.9rem;
}

.detail-loading i {
  width: 180px;
  height: 5px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, #dbeaf3, #4fb6df, #dbeaf3);
  background-size: 200% 100%;
  animation: detail-loading 1.2s ease-in-out infinite;
}

@keyframes detail-loading {
  to {
    background-position: -200% 0;
  }
}

.detail-error p {
  margin: 8px 0 16px;
  font-size: 0.78rem;
}

.detail-error button,
.source-notice button {
  min-height: 35px;
  padding: 7px 12px;
  border: 1px solid #c7dce9;
  border-radius: 10px;
  color: #397392;
  background: #ffffff;
  font-size: 0.7rem;
  font-weight: 800;
}

.detail-error button:hover,
.detail-error button:focus-visible,
.source-notice button:hover,
.source-notice button:focus-visible {
  border-color: #4aa8dd;
  color: #176d9f;
  background: #eaf7ff;
  outline: none;
}

.source-notice button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.view-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 3px 0;
}

.view-heading__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, #e8f7ff, #fff8d8);
  box-shadow: 0 8px 20px rgb(52 104 148 / 10%);
  font-size: 1.45rem;
}

.view-heading p,
.unknown-city > p:first-of-type {
  margin: 0 0 3px;
  color: #79a3bd;
  font-size: 0.63rem;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.view-heading h2 {
  margin: 0;
  color: #29445e;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
}

.weather-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border-radius: 18px;
  color: #ffffff;
  background: linear-gradient(135deg, #43a9e4, #5bc5c1);
  box-shadow: 0 15px 32px rgb(55 151 197 / 18%);
}

.location-label {
  font-size: 0.82rem;
  font-weight: 700;
  opacity: 0.92;
}

.temperature {
  margin: 12px 0 0;
  font-size: clamp(2.8rem, 8vw, 4.3rem);
  font-weight: 850;
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.temperature small {
  margin-left: 4px;
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: 0;
}

.condition {
  margin: 10px 0 0;
  font-size: 0.88rem;
  font-weight: 700;
  opacity: 0.92;
}

.weather-hero__icon {
  display: grid;
  width: 110px;
  height: 110px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 38%);
  border-radius: 30px;
  background: rgb(255 255 255 / 18%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 30%);
  font-size: 3.5rem;
  backdrop-filter: blur(8px);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 0;
}

.detail-grid div {
  padding: 15px 11px;
  border: 1px solid #dfebf3;
  border-radius: 14px;
  background: rgb(255 255 255 / 88%);
  text-align: center;
}

.detail-grid dt {
  color: #7890a4;
  font-size: 0.7rem;
  font-weight: 700;
}

.detail-grid dd {
  margin: 7px 0 0;
  color: #2c4c67;
  font-size: 1rem;
  font-weight: 850;
}

.observation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.observation-meta span {
  padding: 6px 9px;
  border-radius: 999px;
  color: #668098;
  background: #edf5fa;
  font-size: 0.66rem;
  font-weight: 700;
}

.source-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid #dce9f2;
}

.source-notice p {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #7b91a3;
  font-size: 0.68rem;
  font-weight: 700;
}

.source-notice p span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #37bc80;
  box-shadow: 0 0 0 4px rgb(55 188 128 / 12%);
}

.unknown-city {
  margin-top: 24px;
  padding: 56px 20px;
  border: 1px solid #e0ebf4;
  border-radius: 20px;
  background: #f7fbfe;
  text-align: center;
}

.unknown-city > span {
  display: block;
  margin-bottom: 12px;
  font-size: 3rem;
}

.unknown-city h2 {
  margin: 0;
  color: #29445e;
  font-size: 1.25rem;
}

.unknown-city > p:last-child {
  margin: 9px 0 0;
  color: #7a8da0;
  font-size: 0.84rem;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin-top: 16px;
  padding: 9px 15px;
  border: 0;
  border-radius: 11px;
  color: #ffffff;
  background: #294f6d;
  box-shadow: 0 8px 18px rgb(41 79 109 / 17%);
  font-size: 0.78rem;
  font-weight: 750;
}

.back-button:hover,
.back-button:focus-visible {
  background: #1f405a;
  outline: 3px solid rgb(65 169 228 / 23%);
}

@media (max-width: 760px) {
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .weather-hero {
    padding: 19px;
  }

  .weather-hero__icon {
    width: 76px;
    height: 76px;
    border-radius: 22px;
    font-size: 2.4rem;
  }

  .detail-grid div:last-child {
    grid-column: auto;
  }

  .source-notice {
    align-items: stretch;
    flex-direction: column;
  }

  .source-notice button {
    width: 100%;
  }
}
</style>
