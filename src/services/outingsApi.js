import axios from 'axios'
import { fetchCurrentWeather } from './weatherApi'

const TOUR_API_KEY = import.meta.env.VITE_TOUR_API_KEY?.trim()
const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2'
const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving'

// 행사명과 주소에 아래 단어가 있으면 실내 행사로 분류한다.
const indoorKeywords = [
  '전시',
  '미술',
  '박물관',
  '갤러리',
  '아트',
  '공연',
  '뮤지컬',
  '연극',
  '콘서트',
  '문화회관',
  '컨벤션',
  '실내',
]

export const isTourApiConfigured = Boolean(TOUR_API_KEY)

const formatApiDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const getEventDateRange = () => {
  const today = new Date()
  const start = new Date(today)
  const end = new Date(today)
  start.setMonth(start.getMonth() - 6)
  end.setMonth(end.getMonth() + 6)

  return {
    today: formatApiDate(today),
    start: formatApiDate(start),
    end: formatApiDate(end),
  }
}

const normalizeTourApiKey = () => {
  try {
    return decodeURIComponent(TOUR_API_KEY)
  } catch {
    return TOUR_API_KEY
  }
}

const toArray = (value) => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const inferEventType = (title = '') => {
  if (title.includes('전시') || title.includes('미술')) return '전시'
  if (
    title.includes('공연') ||
    title.includes('연극') ||
    title.includes('뮤지컬') ||
    title.includes('콘서트')
  ) {
    return '공연'
  }
  if (title.includes('마켓') || title.includes('장터')) return '마켓'
  if (title.includes('체험')) return '체험'
  return '축제·행사'
}

// TourAPI 응답에서 화면에 필요한 값만 같은 형식으로 정리한다.
const normalizeEvent = (item) => {
  const latitude = Number(item.mapy)
  const longitude = Number(item.mapx)
  const searchText = `${item.title ?? ''} ${item.addr1 ?? ''} ${item.addr2 ?? ''}`

  return {
    id: String(item.contentid),
    title: item.title?.trim() || '이름 없는 행사',
    address: [item.addr1, item.addr2].filter(Boolean).join(' '),
    latitude,
    longitude,
    eventStart: item.eventstartdate,
    eventEnd: item.eventenddate,
    imageUrl: item.firstimage || item.firstimage2 || '',
    phone: item.tel || '',
    type: inferEventType(item.title),
    isIndoor: indoorKeywords.some((keyword) => searchText.includes(keyword)),
  }
}

// 실제 도로 조회 전에 가까운 후보를 거르기 위한 직선거리를 계산한다.
const getDistanceKm = (origin, destination) => {
  const toRadians = (degree) => (degree * Math.PI) / 180
  const earthRadiusKm = 6371
  const latitudeDistance = toRadians(destination.latitude - origin.latitude)
  const longitudeDistance = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDistance / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 현재 날짜에 진행 중인 행사만 TourAPI에서 가져온다.
const fetchCurrentEvents = async () => {
  if (!TOUR_API_KEY) {
    const error = new Error('행사 정보 API 키가 설정되지 않았습니다.')
    error.code = 'MISSING_TOUR_API_KEY'
    throw error
  }

  const dateRange = getEventDateRange()
  const { data } = await axios.get(`${TOUR_API_BASE_URL}/searchFestival2`, {
    timeout: 12000,
    params: {
      serviceKey: normalizeTourApiKey(),
      numOfRows: 500,
      pageNo: 1,
      MobileOS: 'ETC',
      MobileApp: 'WeatherDashboard',
      _type: 'json',
      arrange: 'Q',
      eventStartDate: dateRange.start,
      eventEndDate: dateRange.end,
    },
  })

  const header = data?.response?.header
  if (header?.resultCode && header.resultCode !== '0000') {
    throw new Error(header.resultMsg || '행사 정보를 불러오지 못했습니다.')
  }

  return toArray(data?.response?.body?.items?.item)
    .map(normalizeEvent)
    .filter(
      (event) =>
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude) &&
        event.eventStart <= dateRange.today &&
        event.eventEnd >= dateRange.today,
    )
}

// 출발지에서 각 행사까지의 자동차 이동시간과 거리를 한 번에 조회한다.
const fetchDrivingTimes = async (origin, destinations) => {
  if (!destinations.length) return []

  const locations = [origin, ...destinations]
    .map((location) => `${location.longitude},${location.latitude}`)
    .join(';')
  const destinationIndexes = destinations
    .map((_, index) => index + 1)
    .join(';')

  const { data } = await axios.get(`${OSRM_TABLE_URL}/${locations}`, {
    timeout: 12000,
    params: {
      sources: '0',
      destinations: destinationIndexes,
      annotations: 'duration,distance',
      skip_waypoints: 'true',
    },
  })

  if (data.code !== 'Ok') {
    throw new Error('자동차 이동시간을 계산하지 못했습니다.')
  }

  const durations = data.durations?.[0] ?? []
  const distances = data.distances?.[0] ?? []

  return destinations.map((event, index) => ({
    ...event,
    driveMinutes: Number.isFinite(durations[index])
      ? Math.round(durations[index] / 60)
      : null,
    driveDistanceKm: Number.isFinite(distances[index])
      ? Math.round(distances[index] / 100) / 10
      : null,
  }))
}

const hasRainOrSnow = (weather) =>
  weather?.status?.includes('비') ||
  weather?.status?.includes('눈') ||
  Number(weather?.rainLastHour) > 0

// 22도에 가까울수록 높은 점수를 주고 비·눈, 강풍, 극단 기온은 감점한다.
const getWeatherScore = (weather, isIndoor) => {
  if (!weather) return 45

  const temperatureScore = Math.max(25, 100 - Math.abs(weather.temp - 22) * 5)
  let score = temperatureScore

  if (hasRainOrSnow(weather)) score -= isIndoor ? 8 : 35
  if (weather.windSpeed >= 8) score -= isIndoor ? 4 : 18
  if (weather.temp >= 32 || weather.temp <= 2) score -= isIndoor ? 8 : 20

  return Math.round(Math.min(100, Math.max(0, score)))
}

const getWeatherReason = (weather, isIndoor) => {
  if (!weather) return '현지 날씨를 확인하지 못해 이동시간을 기준으로 정렬했습니다.'
  if (hasRainOrSnow(weather) && isIndoor) {
    return '비나 눈이 예상되어 실내 일정을 먼저 표시했습니다.'
  }
  if (hasRainOrSnow(weather)) {
    return '비나 눈 소식이 있어 우산과 미끄럽지 않은 신발을 준비하세요.'
  }
  if (weather.temp >= 17 && weather.temp <= 27 && weather.windSpeed < 8) {
    return '기온과 바람이 야외 활동에 무난합니다.'
  }
  if (weather.temp > 27) {
    return isIndoor
      ? '기온이 높아 실내 일정으로 분류했습니다.'
      : '더운 날씨라 물과 자외선 차단 용품을 챙기세요.'
  }
  return isIndoor
    ? '기온이 낮아 실내 일정으로 분류했습니다.'
    : '다소 쌀쌀할 수 있으니 가벼운 겉옷을 준비하세요.'
}

const addRecommendationScore = (event, maxDriveMinutes) => {
  const weatherScore = getWeatherScore(event.weather, event.isIndoor)
  const travelScore = Math.max(
    0,
    100 - (event.driveMinutes / maxDriveMinutes) * 72,
  )
  const suitabilityScore = event.isIndoor && hasRainOrSnow(event.weather) ? 100 : 75

  // 날씨 55%, 이동시간 35%, 실내 적합도 10% 비율로 최종 점수를 만든다.
  return {
    ...event,
    weatherScore,
    recommendationScore: Math.round(
      weatherScore * 0.55 + travelScore * 0.35 + suitabilityScore * 0.1,
    ),
    recommendationReason: getWeatherReason(event.weather, event.isIndoor),
  }
}

export const fetchOutingRecommendations = async ({
  origin,
  maxDriveMinutes = 120,
  limit = 12,
}) => {
  const events = await fetchCurrentEvents()

  // OSRM 요청이 너무 커지지 않도록 가까운 행사 24곳을 먼저 추린다.
  const candidateRadiusKm = maxDriveMinutes * 1.8
  const nearbyCandidates = events
    .map((event) => ({
      ...event,
      straightDistanceKm: getDistanceKm(origin, event),
    }))
    .filter((event) => event.straightDistanceKm <= candidateRadiusKm)
    .sort((a, b) => a.straightDistanceKm - b.straightDistanceKm)
    .slice(0, 24)

  const routedEvents = await fetchDrivingTimes(origin, nearbyCandidates)
  const reachableEvents = routedEvents
    .filter(
      (event) =>
        Number.isFinite(event.driveMinutes) &&
        event.driveMinutes <= maxDriveMinutes,
    )
    .slice(0, limit)

  // 행사 한 곳의 날씨 조회가 실패해도 나머지 추천은 계속 계산한다.
  const weatherResults = await Promise.allSettled(
    reachableEvents.map((event) =>
      fetchCurrentWeather({
        id: `outing_${event.id}`,
        name: event.title,
        region: event.address,
        latitude: event.latitude,
        longitude: event.longitude,
      }),
    ),
  )

  return reachableEvents
    .map((event, index) => ({
      ...event,
      weather:
        weatherResults[index]?.status === 'fulfilled'
          ? weatherResults[index].value
          : null,
    }))
    .map((event) => addRecommendationScore(event, maxDriveMinutes))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
}

// 외부 API 오류 종류에 따라 화면에 표시할 문구를 정한다.
export const getOutingApiErrorMessage = (error) => {
  if (error.code === 'MISSING_TOUR_API_KEY') {
    return '행사 정보 연결이 필요합니다. 공공데이터포털 TourAPI 키를 설정해 주세요.'
  }
  if (error.code === 'ECONNABORTED') {
    return '행사 또는 이동시간 서버의 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (!error.response) {
    return '네트워크 연결을 확인한 후 다시 시도해 주세요.'
  }
  if (error.response.status === 401 || error.response.status === 403) {
    return 'TourAPI 인증키와 활용신청 승인 상태를 확인해 주세요.'
  }
  return '나들이 추천 정보를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
