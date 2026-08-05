export const getWeatherStatus = (weatherMain, cloudiness = 0) => {
  // OpenWeatherMap의 영문 상태를 화면용 한국어 표현으로 바꾼다.
  const statusMap = {
    Clear: '맑음',
    Rain: '비',
    Drizzle: '약한 비',
    Thunderstorm: '천둥번개',
    Snow: '눈',
    Mist: '안개',
    Smoke: '흐림',
    Haze: '흐림',
    Dust: '흐림',
    Fog: '안개',
    Sand: '흐림',
    Ash: '흐림',
    Squall: '강한 바람',
    Tornado: '돌풍',
  }

  // Clouds는 구름량에 따라 세 단계로 나눠 표시한다.
  if (weatherMain === 'Clouds') {
    if (cloudiness <= 25) return '구름 조금'
    if (cloudiness <= 75) return '구름 많음'
    return '흐림'
  }

  return statusMap[weatherMain] ?? '날씨 변화'
}

// 날씨 카드와 게임에서 공통으로 사용할 아이콘을 반환한다.
export const getWeatherEmoji = (status = '') => {
  if (status === '맑음') return '☀️'
  if (status.includes('천둥')) return '⛈️'
  if (status.includes('비')) return '🌧️'
  if (status.includes('눈')) return '🌨️'
  if (status.includes('안개')) return '🌫️'
  if (status.includes('구름')) return '☁️'
  if (status === '흐림') return '🌥️'
  if (status.includes('바람') || status.includes('돌풍')) return '💨'
  return '🌤️'
}
