import { computed, ref, watch } from 'vue'
import { worldCityDefinitions } from '../data/worldCities'
import { useConfigStore } from '../stores/configStore'
import { useMemberStore } from '../stores/memberStore'
import { useWeatherStore } from '../stores/weatherStore'
import { useWorldWeatherStore } from '../stores/worldWeatherStore'

const createInitialMessage = (member) => ({
  id: Date.now(),
  role: 'assistant',
  text: member
    ? `${member.name}님의 관심 도시는 ${member.favoriteCity}입니다. 다른 도시도 검색할 수 있습니다.`
    : '도시 이름과 함께 날씨, 우산, 옷차림을 입력해 주세요.',
})

// 질문의 범위가 국내인지 세계인지 구분할 때 사용하는 단어 목록이다.
const worldQuestionKeywords = [
  '세계',
  '해외',
  '대륙',
  '아시아',
  '유럽',
  '북아메리카',
  '남아메리카',
  '오세아니아',
  '아프리카',
]

const outingQuestionKeywords = [
  '놀러',
  '나들이',
  '갈만한',
  '행사',
  '전시',
  '데이트',
  '주말에뭐',
  '오늘뭐',
]

// 도시명 뒤에 자연스러운 조사를 붙이기 위해 받침 유무를 확인한다.
const hasFinalConsonant = (word = '') => {
  const lastCode = word.charCodeAt(word.length - 1)
  return lastCode >= 0xac00 && lastCode <= 0xd7a3
    ? (lastCode - 0xac00) % 28 !== 0
    : false
}

const topic = (word) => `${word}${hasFinalConsonant(word) ? '은' : '는'}`
const subject = (word) => `${word}${hasFinalConsonant(word) ? '이' : '가'}`
const copula = (word) => `${word}${hasFinalConsonant(word) ? '이에요' : '예요'}`

const getOutfitAdvice = (temperature) => {
  if (temperature >= 28) return '반팔처럼 가벼운 옷과 자외선 차단 용품이 필요합니다.'
  if (temperature >= 23) return '반팔이나 얇은 셔츠가 적당합니다.'
  if (temperature >= 20) return '얇은 긴팔이나 가벼운 가디건을 챙기세요.'
  if (temperature >= 17) return '맨투맨이나 얇은 재킷이 적당합니다.'
  if (temperature >= 12) return '재킷이나 니트처럼 보온되는 겉옷이 필요합니다.'
  if (temperature >= 5) return '코트와 따뜻한 니트를 준비하세요.'
  return '두꺼운 외투와 목도리, 장갑으로 따뜻하게 입으세요.'
}

const needsUmbrella = (city) =>
  city.status?.includes('비') ||
  city.status?.includes('눈') ||
  Number(city.rainLastHour) > 0

export const useWeatherAssistant = () => {
  const weatherStore = useWeatherStore()
  const worldWeatherStore = useWorldWeatherStore()
  const configStore = useConfigStore()
  const memberStore = useMemberStore()
  const messages = ref([createInitialMessage(memberStore.member)])
  const draft = ref('')
  const isThinking = ref(false)

  const suggestedQuestions = computed(() =>
    memberStore.isRegistered
      ? [
          '내 관심 도시 날씨',
          '오늘 어디 놀러갈까?',
          '세계에서 가장 더운 도시는?',
          '내 회원정보 보여줘',
        ]
      : [
          '회원가입은 어디서 해?',
          '오늘 어디 놀러갈까?',
          '세계에서 가장 더운 도시는?',
          '서울 옷차림 추천',
        ],
  )

  const formatTemperature = (temperature) => {
    if (!Number.isFinite(Number(temperature))) return '확인되지 않음'
    if (configStore.unit === 'fahrenheit') {
      return `${Math.round((temperature * 9) / 5 + 32)}°F`
    }
    return `${temperature}°C`
  }

  const findCity = (question, weatherList) =>
    weatherList.find((city) => question.includes(city.name))

  // 도시 이름이 포함된 질문은 옷차림·우산·습도·바람 순으로 의도를 확인한다.
  const buildCityAnswer = (question, city) => {
    if (question.includes('옷') || question.includes('입')) {
      return `${topic(city.name)} 현재 ${formatTemperature(city.temp)}예요. ${getOutfitAdvice(city.temp)}`
    }

    if (question.includes('우산') || question.includes('비')) {
      return needsUmbrella(city)
        ? `${topic(city.name)} 현재 ${city.status}입니다. 우산을 챙기세요.`
        : `${topic(city.name)} 현재 ${city.status}이며 비는 관측되지 않았습니다.`
    }

    if (question.includes('습도')) {
      return `${city.name}의 현재 습도는 ${city.humidity ?? '확인되지 않음'}%예요.`
    }

    if (question.includes('바람') || question.includes('풍속')) {
      return `${city.name}의 현재 풍속은 ${city.windSpeed ?? '확인되지 않음'}m/s예요.`
    }

    return `${topic(city.name)} 현재 ${city.status}, 기온은 ${formatTemperature(city.temp)}예요. 체감온도는 ${formatTemperature(city.feelsLike)}, 습도는 ${city.humidity ?? '확인되지 않음'}%입니다.`
  }

  // 특정 도시가 없으면 여러 도시를 비교하는 질문으로 처리한다.
  const buildAnswer = (question, weatherList, scopeLabel) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    const city = findCity(normalizedQuestion, weatherList)
    if (city) return buildCityAnswer(normalizedQuestion, city)

    if (
      normalizedQuestion.includes('더운') ||
      normalizedQuestion.includes('높은기온') ||
      normalizedQuestion.includes('최고기온')
    ) {
      const hottest = weatherList.reduce((current, item) =>
        item.temp > current.temp ? item : current,
      )
      return `${scopeLabel} 중 지금 가장 더운 곳은 ${copula(hottest.name)}. 현재 기온은 ${formatTemperature(hottest.temp)}, 날씨는 ${hottest.status}입니다.`
    }

    if (
      normalizedQuestion.includes('추운') ||
      normalizedQuestion.includes('낮은기온') ||
      normalizedQuestion.includes('최저기온')
    ) {
      const coldest = weatherList.reduce((current, item) =>
        item.temp < current.temp ? item : current,
      )
      return `${scopeLabel} 중 지금 기온이 가장 낮은 곳은 ${copula(coldest.name)}. 현재 ${formatTemperature(coldest.temp)}입니다.`
    }

    if (normalizedQuestion.includes('우산') || normalizedQuestion.includes('비오는')) {
      const rainyCities = weatherList.filter(needsUmbrella)
      return rainyCities.length > 0
        ? `${rainyCities.map((item) => item.name).join(', ')}에 비나 눈이 관측되고 있습니다. 우산을 챙기세요.`
        : `${scopeLabel} 중 현재 비나 눈이 관측되는 곳은 없습니다.`
    }

    if (normalizedQuestion.includes('습도')) {
      const mostHumid = weatherList.reduce((current, item) =>
        item.humidity > current.humidity ? item : current,
      )
      return `${scopeLabel} 중 ${subject(mostHumid.name)} 습도 ${mostHumid.humidity}%로 가장 높습니다.`
    }

    if (normalizedQuestion.includes('바람') || normalizedQuestion.includes('풍속')) {
      const windiest = weatherList.reduce((current, item) =>
        item.windSpeed > current.windSpeed ? item : current,
      )
      return `${scopeLabel} 중 ${subject(windiest.name)} 풍속 ${windiest.windSpeed}m/s로 바람이 가장 강합니다.`
    }

    if (normalizedQuestion.includes('옷') || normalizedQuestion.includes('입')) {
      const averageTemperature =
        weatherList.reduce((sum, item) => sum + item.temp, 0) /
        weatherList.length
      return `${scopeLabel}의 평균 기온은 약 ${formatTemperature(Math.round(averageTemperature))}입니다. ${getOutfitAdvice(averageTemperature)} 도시 이름을 함께 입력하면 해당 지역을 확인할 수 있습니다.`
    }

    if (normalizedQuestion.includes('도시') || normalizedQuestion.includes('전체')) {
      return `${scopeLabel}에서는 ${weatherList.map((item) => item.name).join(', ')}의 날씨를 확인할 수 있습니다.`
    }

    return '도시 이름과 함께 날씨, 옷차림, 우산 중 궁금한 내용을 입력해 주세요.'
  }

  const isWorldQuestion = (question) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    return (
      worldQuestionKeywords.some((keyword) =>
        normalizedQuestion.includes(keyword),
      ) ||
      worldCityDefinitions.some((city) =>
        normalizedQuestion.includes(city.name),
      )
    )
  }

  const filterByContinent = (question, weatherList) => {
    const continent = worldQuestionKeywords
      .slice(3)
      .find((keyword) => question.includes(keyword))

    return continent
      ? weatherList.filter((city) => city.continent === continent)
      : weatherList
  }

  const getWorldScopeLabel = (question) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    const continent = worldQuestionKeywords
      .slice(3)
      .find((keyword) => normalizedQuestion.includes(keyword))

    return continent ? `${continent} 주요 도시` : '세계 주요 도시'
  }

  // 필요한 범위의 날씨가 아직 없을 때만 Store를 통해 API를 호출한다.
  const ensureWeatherData = async (scope) => {
    if (scope === 'world') {
      if (worldWeatherStore.weatherList.length === 0) {
        await worldWeatherStore.loadAll()
      }
      return worldWeatherStore.weatherList
    }

    if (weatherStore.weatherList.length === 0) await weatherStore.loadAll()
    return weatherStore.weatherList
  }

  // 회원가입 또는 회원정보 관련 질문은 날씨 질문보다 먼저 처리한다.
  const getMemberResponse = (question) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    const asksAboutMember =
      normalizedQuestion.includes('회원정보') ||
      normalizedQuestion.includes('내정보') ||
      normalizedQuestion.includes('가입정보') ||
      normalizedQuestion.includes('계정정보')
    const asksAboutSignUp = normalizedQuestion.includes('회원가입')

    if (!asksAboutMember && !asksAboutSignUp) return null

    if (!memberStore.member) {
      return {
        text: '저장된 회원 정보가 없습니다. 회원가입 화면에서 이름과 관심 도시를 등록할 수 있습니다.',
        action: { label: '회원가입하기', to: '/signup' },
      }
    }

    return {
      text: `${memberStore.member.name}님의 이메일은 ${memberStore.member.email}, 관심 도시는 ${memberStore.member.favoriteCity}로 등록되어 있어요.`,
      action: { label: '회원정보 확인', to: '/signup' },
    }
  }

  const getOutingResponse = (question) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    if (
      !outingQuestionKeywords.some((keyword) =>
        normalizedQuestion.includes(keyword),
      )
    ) {
      return null
    }

    const greeting = memberStore.member
      ? `${memberStore.member.name}님, `
      : ''

    return {
      text: `${greeting}출발 위치와 운전시간을 설정하면 진행 중인 행사와 현지 날씨를 함께 확인할 수 있습니다.`,
      action: { label: '나들이 추천받기', to: '/outings' },
    }
  }

  const getFavoriteCityQuestion = (question) => {
    const normalizedQuestion = question.replaceAll(' ', '')
    const asksFavoriteCity =
      normalizedQuestion.includes('관심도시') ||
      normalizedQuestion.includes('내도시')

    if (!asksFavoriteCity) return { question }
    if (!memberStore.member) {
      return {
        response: {
          text: '관심 도시를 이용하려면 먼저 회원가입 화면에서 도시를 등록해 주세요.',
          action: { label: '관심 도시 등록', to: '/signup' },
        },
      }
    }

    return {
      question: `${memberStore.member.favoriteCity} ${question}`,
    }
  }

  const pushAssistantMessage = ({ text, action }) => {
    messages.value.push({
      id: Date.now() + Math.random(),
      role: 'assistant',
      text,
      action,
    })
  }

  // 질문 종류를 판별한 뒤 알맞은 응답을 대화 목록에 추가한다.
  const sendMessage = async (messageText = draft.value) => {
    const question = messageText.trim()
    if (!question || isThinking.value) return

    messages.value.push({
      id: Date.now(),
      role: 'user',
      text: question,
    })
    draft.value = ''
    isThinking.value = true

    try {
      const outingResponse = getOutingResponse(question)
      if (outingResponse) {
        await new Promise((resolve) => setTimeout(resolve, 240))
        pushAssistantMessage(outingResponse)
        return
      }

      const memberResponse = getMemberResponse(question)
      if (memberResponse) {
        await new Promise((resolve) => setTimeout(resolve, 240))
        pushAssistantMessage(memberResponse)
        return
      }

      const favoriteCityQuestion = getFavoriteCityQuestion(question)
      if (favoriteCityQuestion.response) {
        await new Promise((resolve) => setTimeout(resolve, 240))
        pushAssistantMessage(favoriteCityQuestion.response)
        return
      }

      const resolvedQuestion = favoriteCityQuestion.question
      const scope = isWorldQuestion(resolvedQuestion) ? 'world' : 'domestic'
      let weatherList = await ensureWeatherData(scope)

      if (scope === 'world') {
        weatherList = filterByContinent(
          resolvedQuestion.replaceAll(' ', ''),
          weatherList,
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 380))

      if (!weatherList.length) {
        pushAssistantMessage({
          text: '날씨 데이터를 불러오지 못했습니다. API 설정과 네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
        })
        return
      }

      pushAssistantMessage({
        text: buildAnswer(
          resolvedQuestion,
          weatherList,
          scope === 'world'
            ? getWorldScopeLabel(resolvedQuestion)
            : '국내 주요 도시',
        ),
        action:
          scope === 'world'
            ? { label: '세계 날씨 보기', to: '/world' }
            : undefined,
      })
    } catch {
      pushAssistantMessage({
        text: '날씨 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      })
    } finally {
      isThinking.value = false
    }
  }

  const clearConversation = () => {
    messages.value = [createInitialMessage(memberStore.member)]
  }

  // 회원가입이 끝나면 관심 도시를 바로 질문할 수 있도록 안내한다.
  watch(
    () => memberStore.member?.joinedAt,
    (joinedAt, previousJoinedAt) => {
      if (!joinedAt || joinedAt === previousJoinedAt) return

      pushAssistantMessage({
        text: `${memberStore.member.name}님의 관심 도시가 ${memberStore.member.favoriteCity}로 저장되었습니다. “내 관심 도시 날씨”라고 입력해 보세요.`,
        action: { label: '세계 날씨 둘러보기', to: '/world' },
      })
    },
  )

  return {
    messages,
    draft,
    isThinking,
    suggestedQuestions,
    sendMessage,
    clearConversation,
  }
}
