import axios from 'axios'
import { getWeatherStatus } from '../utils/weatherPresentation'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim()

// 모든 날씨 요청에 공통으로 적용할 주소와 제한시간을 설정한다.
const weatherClient = axios.create({
  baseURL: 'https://api.openweathermap.org/data/2.5',
  timeout: 10000,
})

const roundToOneDecimal = (value) => Math.round(value * 10) / 10

// 위도와 경도를 이용해 OpenWeatherMap의 현재 관측값을 가져온다.
export const fetchCurrentWeather = async (cityDefinition) => {
  if (!API_KEY) {
    const error = new Error('OpenWeatherMap API 키가 설정되지 않았습니다.')
    error.code = 'MISSING_API_KEY'
    throw error
  }

  const { data } = await weatherClient.get('/weather', {
    params: {
      lat: cityDefinition.latitude,
      lon: cityDefinition.longitude,
      appid: API_KEY,
      units: 'metric',
      lang: 'kr',
    },
  })

  // API 용어를 화면에서 익숙한 한국어 날씨 표현으로 바꾼다.
  const currentCondition = data.weather?.[0] ?? {}
  const cloudiness = data.clouds?.all ?? 0
  const familiarStatus = getWeatherStatus(
    currentCondition.main,
    cloudiness,
  )

  return {
    ...cityDefinition,
    temp: roundToOneDecimal(data.main.temp),
    feelsLike: roundToOneDecimal(data.main.feels_like),
    status: familiarStatus,
    description: familiarStatus,
    apiDescription: currentCondition.description ?? '',
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: roundToOneDecimal(data.wind?.speed ?? 0),
    visibilityKm: roundToOneDecimal((data.visibility ?? 0) / 1000),
    cloudiness,
    rainLastHour: data.rain?.['1h'] ?? data.snow?.['1h'] ?? 0,
    sunrise: data.sys?.sunrise,
    sunset: data.sys?.sunset,
    timezone: data.timezone ?? 0,
    observationTime: data.dt,
    source: 'OpenWeatherMap',
  }
}

// Axios 오류를 사용자가 이해할 수 있는 안내 문구로 변환한다.
export const getWeatherApiErrorMessage = (error) => {
  if (error.code === 'MISSING_API_KEY') {
    return 'OpenWeatherMap API 키가 설정되지 않았습니다.'
  }

  if (error.code === 'ECONNABORTED') {
    return '날씨 서버의 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
  }

  if (!error.response) {
    return '네트워크 연결을 확인한 후 다시 시도해 주세요.'
  }

  const statusMessages = {
    401: 'OpenWeatherMap API 키를 확인해 주세요.',
    404: '요청한 도시의 날씨 정보를 찾을 수 없습니다.',
    429: 'API 요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  }

  return (
    statusMessages[error.response.status] ??
    '날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  )
}
