<script setup>
import { computed, onMounted, ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import { useConfigStore } from '../stores/configStore'
import { useWeatherStore } from '../stores/weatherStore'
import { getWeatherEmoji } from '../utils/weatherPresentation'

const totalRounds = 5
const highScoreKey = 'weather-city-quiz-high-score'
const weatherStore = useWeatherStore()
const configStore = useConfigStore()

const questions = ref([])
const currentRoundIndex = ref(0)
const selectedCityId = ref('')
const score = ref(0)
const isAnswered = ref(false)
const isCompleted = ref(false)
const isPreparing = ref(false)
const gameError = ref('')
const highScore = ref(Number(localStorage.getItem(highScoreKey)) || 0)

const currentQuestion = computed(
  () => questions.value[currentRoundIndex.value] ?? null,
)
const currentRound = computed(() => currentRoundIndex.value + 1)
const progress = computed(() =>
  questions.value.length
    ? (currentRound.value / questions.value.length) * 100
    : 0,
)
const isCorrect = computed(
  () => selectedCityId.value === currentQuestion.value?.answer.id,
)

// 원본 배열을 바꾸지 않고 보기 순서를 무작위로 섞는다.
const shuffle = (items) => {
  const shuffledItems = [...items]
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ]
  }
  return shuffledItems
}

const formatTemperature = (temperature) => {
  if (configStore.unit === 'fahrenheit') {
    return `${Math.round((temperature * 9) / 5 + 32)}°F`
  }
  return `${temperature}°C`
}

// 정답 하나와 오답 세 개를 묶어 총 다섯 문제를 만든다.
const createQuestions = (weatherList) =>
  shuffle(weatherList)
    .slice(0, totalRounds)
    .map((answer) => {
      const wrongAnswers = shuffle(
        weatherList.filter((city) => city.id !== answer.id),
      ).slice(0, 3)

      return {
        answer,
        choices: shuffle([answer, ...wrongAnswers]).map((city) => ({
          id: city.id,
          name: city.name,
        })),
      }
    })

// 새 게임을 시작할 때 점수와 진행 상태를 모두 초기화한다.
const startGame = async () => {
  isPreparing.value = true
  gameError.value = ''
  isCompleted.value = false
  currentRoundIndex.value = 0
  selectedCityId.value = ''
  score.value = 0
  isAnswered.value = false

  try {
    if (weatherStore.weatherList.length < 4) {
      await weatherStore.loadAll()
    }

    if (weatherStore.weatherList.length < 4) {
      gameError.value = '게임에 필요한 날씨 데이터를 불러오지 못했습니다.'
      questions.value = []
      return
    }

    questions.value = createQuestions(weatherStore.weatherList)
  } catch {
    gameError.value = '날씨 데이터를 준비하는 중 문제가 발생했습니다.'
  } finally {
    isPreparing.value = false
  }
}

const selectAnswer = (cityId) => {
  if (isAnswered.value) return

  selectedCityId.value = cityId
  isAnswered.value = true

  if (cityId === currentQuestion.value.answer.id) {
    score.value += 20
  }
}

const finishGame = () => {
  isCompleted.value = true

  // 최고 점수는 새로고침 후에도 남도록 브라우저에 저장한다.
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem(highScoreKey, String(score.value))
  }
}

const goToNextRound = () => {
  if (currentRoundIndex.value >= questions.value.length - 1) {
    finishGame()
    return
  }

  currentRoundIndex.value += 1
  selectedCityId.value = ''
  isAnswered.value = false
}

const getChoiceClass = (cityId) => {
  if (!isAnswered.value) return ''
  if (cityId === currentQuestion.value.answer.id) return 'choice--correct'
  if (cityId === selectedCityId.value) return 'choice--wrong'
  return 'choice--muted'
}

onMounted(startGame)
</script>

<template>
  <section class="game-view" aria-labelledby="game-heading">
    <motion.div
      class="game-hero"
      :initial="{ opacity: 0, y: 18 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <div>
        <span class="game-eyebrow">오늘의 날씨 퀴즈</span>
        <h2 id="game-heading">도시 날씨 퀴즈</h2>
        <p>현재 날씨 정보를 보고 알맞은 도시를 선택하세요.</p>
      </div>
      <div class="high-score">
        <small>최고 점수</small>
        <strong>{{ highScore }}</strong>
      </div>
    </motion.div>

    <BaseDashboardCard
      title="도시 날씨 맞히기"
      icon="🎯"
      heading-id="weather-quiz-heading"
    >
      <div v-if="isPreparing" class="game-state" aria-busy="true">
        <motion.span
          :animate="{ rotate: 360 }"
          :transition="{ duration: 1, repeat: Infinity, ease: 'linear' }"
          aria-hidden="true"
        >🌤️</motion.span>
        <strong>문제를 준비하고 있습니다.</strong>
      </div>

      <div v-else-if="gameError" class="game-state game-state--error" role="alert">
        <span aria-hidden="true">🌧️</span>
        <strong>{{ gameError }}</strong>
        <button type="button" @click="startGame">다시 준비하기</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          v-if="isCompleted"
          key="result"
          class="result-card"
          :initial="{ opacity: 0, scale: 0.94 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.96 }"
        >
          <motion.span
            :initial="{ rotate: -14, scale: 0.7 }"
            :animate="{ rotate: 0, scale: 1 }"
            :transition="{ type: 'spring', stiffness: 280, damping: 16 }"
            aria-hidden="true"
          >{{ score >= 80 ? '🏆' : score >= 60 ? '🎉' : '🕵️' }}</motion.span>
          <small>5라운드 완료</small>
          <strong>{{ score }}점</strong>
          <p v-if="score === 100">모든 문제를 맞혔습니다.</p>
          <p v-else-if="score >= 60">세 문제 이상 맞혔습니다.</p>
          <p v-else>날씨 카드를 확인한 뒤 다시 풀어보세요.</p>
          <motion.button
            type="button"
            :while-hover="{ y: -2, scale: 1.02 }"
            :while-press="{ scale: 0.95 }"
            @click="startGame"
          >
            다시 풀기
          </motion.button>
        </motion.div>

        <motion.div
          v-else-if="currentQuestion"
          :key="currentRoundIndex"
          class="quiz-board"
          :initial="{ opacity: 0, x: 18 }"
          :animate="{ opacity: 1, x: 0 }"
          :exit="{ opacity: 0, x: -18 }"
          :transition="{ duration: 0.32 }"
        >
          <div class="round-status">
            <span>{{ currentRound }}번째 문제 / {{ questions.length }}</span>
            <strong>{{ score }}점</strong>
          </div>
          <div class="progress-track" aria-hidden="true">
            <motion.span :animate="{ width: `${progress}%` }" />
          </div>

          <div class="clue-card">
            <div v-if="isAnswered && isCorrect" class="confetti" aria-hidden="true">
              <i v-for="index in 12" :key="index"></i>
            </div>
            <span class="mystery-label">도시 이름은 비밀</span>
            <div class="weather-clue">
              <motion.span
                :animate="{ y: [0, -6, 0] }"
                :transition="{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }"
                aria-hidden="true"
              >{{ getWeatherEmoji(currentQuestion.answer.status) }}</motion.span>
              <div>
                <small>현재 날씨</small>
                <strong>{{ currentQuestion.answer.status }}</strong>
              </div>
            </div>
            <dl class="clue-metrics">
              <div>
                <dt>기온</dt>
                <dd>{{ formatTemperature(currentQuestion.answer.temp) }}</dd>
              </div>
              <div>
                <dt>체감</dt>
                <dd>{{ formatTemperature(currentQuestion.answer.feelsLike) }}</dd>
              </div>
              <div>
                <dt>습도</dt>
                <dd>{{ currentQuestion.answer.humidity }}%</dd>
              </div>
              <div>
                <dt>풍속</dt>
                <dd>{{ currentQuestion.answer.windSpeed }}m/s</dd>
              </div>
            </dl>
          </div>

          <fieldset class="choice-fieldset">
            <legend>이 날씨를 관측한 도시는 어디일까요?</legend>
            <div class="choice-grid">
              <motion.button
                v-for="choice in currentQuestion.choices"
                :key="choice.id"
                type="button"
                :class="getChoiceClass(choice.id)"
                :disabled="isAnswered"
                :while-hover="isAnswered ? {} : { y: -3, scale: 1.015 }"
                :while-press="isAnswered ? {} : { scale: 0.97 }"
                @click="selectAnswer(choice.id)"
              >
                <span aria-hidden="true">⌖</span>
                {{ choice.name }}
              </motion.button>
            </div>
          </fieldset>

          <motion.div
            v-if="isAnswered"
            class="answer-feedback"
            :class="{ 'answer-feedback--correct': isCorrect }"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            role="status"
          >
            <div>
              <span aria-hidden="true">{{ isCorrect ? '✓' : '!' }}</span>
              <p>
                <strong>{{ isCorrect ? '정답입니다.' : '오답입니다.' }}</strong>
                정답은 {{ currentQuestion.answer.name }}입니다.
              </p>
            </div>
            <button type="button" @click="goToNextRound">
              {{ currentRound === questions.length ? '결과 보기' : '다음 문제' }} →
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </BaseDashboardCard>
  </section>
</template>

<style scoped>
.game-view {
  padding-top: 24px;
}

.game-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 23px;
  overflow: hidden;
  border-radius: 20px;
  color: #ffffff;
  background:
    radial-gradient(circle at 86% 8%, rgb(255 218 112 / 27%), transparent 32%),
    linear-gradient(135deg, #284f6c, #2b8292);
  box-shadow: 0 14px 30px rgb(40 95 118 / 18%);
}

.game-eyebrow {
  color: #9fe2da;
  font-size: 0.57rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.game-hero h2 {
  margin: 7px 0 5px;
  font-size: 1.38rem;
  letter-spacing: -0.035em;
}

.game-hero p {
  margin: 0;
  color: #c1dce3;
  font-size: 0.75rem;
}

.high-score {
  display: grid;
  flex: 0 0 auto;
  min-width: 82px;
  justify-items: center;
  padding: 11px;
  border: 1px solid rgb(255 255 255 / 17%);
  border-radius: 14px;
  background: rgb(255 255 255 / 10%);
}

.high-score small {
  color: #b9d9df;
  font-size: 0.58rem;
}

.high-score strong {
  font-size: 1.45rem;
}

.game-state {
  display: grid;
  min-height: 360px;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: #647c8e;
  text-align: center;
}

.game-state > span {
  font-size: 2.4rem;
}

.game-state--error button,
.result-card button {
  min-height: 39px;
  padding: 8px 14px;
  border: 0;
  border-radius: 11px;
  color: #ffffff;
  background: #347fa8;
  font-size: 0.72rem;
  font-weight: 800;
}

.round-status {
  display: flex;
  justify-content: space-between;
  color: #7190a4;
  font-size: 0.65rem;
  font-weight: 850;
}

.round-status strong {
  color: #28799e;
}

.progress-track {
  height: 6px;
  margin: 8px 0 15px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfeaf1;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #40a6dc, #48be94);
}

.clue-card {
  position: relative;
  padding: 20px;
  overflow: hidden;
  border: 1px solid #d8e7f0;
  border-radius: 18px;
  background:
    radial-gradient(circle at 87% 9%, rgb(75 178 224 / 16%), transparent 34%),
    linear-gradient(145deg, #ffffff, #edf8fd);
}

.mystery-label {
  display: inline-flex;
  padding: 5px 8px;
  border-radius: 7px;
  color: #4b829f;
  background: #e5f3fa;
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.weather-clue {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 14px;
}

.weather-clue > span {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid #dcebf3;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(53 105 137 / 9%);
  font-size: 2rem;
}

.weather-clue div {
  display: grid;
  gap: 3px;
}

.weather-clue small {
  color: #8399aa;
  font-size: 0.62rem;
}

.weather-clue strong {
  color: #2c4e67;
  font-size: 1.22rem;
}

.clue-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 17px 0 0;
}

.clue-metrics div {
  padding: 10px;
  border: 1px solid #e0ebf2;
  border-radius: 11px;
  background: rgb(255 255 255 / 78%);
}

.clue-metrics dt {
  color: #8498a8;
  font-size: 0.58rem;
}

.clue-metrics dd {
  margin: 4px 0 0;
  color: #355b73;
  font-size: 0.75rem;
  font-weight: 850;
}

.choice-fieldset {
  margin: 18px 0 0;
  padding: 0;
  border: 0;
}

.choice-fieldset legend {
  margin-bottom: 9px;
  color: #47657a;
  font-size: 0.76rem;
  font-weight: 800;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.choice-grid button {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid #d3e3ed;
  border-radius: 12px;
  color: #4c6a7f;
  background: #ffffff;
  font-size: 0.76rem;
  font-weight: 800;
}

.choice-grid button:not(:disabled):hover,
.choice-grid button:not(:disabled):focus-visible {
  border-color: #63b3df;
  color: #24779f;
  outline: none;
  box-shadow: 0 7px 17px rgb(51 129 171 / 10%);
}

.choice-grid .choice--correct {
  border-color: #55bd8d;
  color: #257451;
  background: #eaf9f2;
  opacity: 1;
}

.choice-grid .choice--wrong {
  border-color: #e79991;
  color: #a14d47;
  background: #fff0ef;
  opacity: 1;
}

.choice-grid .choice--muted {
  opacity: 0.46;
}

.answer-feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid #f0c2bd;
  border-radius: 13px;
  color: #975049;
  background: #fff2f0;
}

.answer-feedback--correct {
  border-color: #bfe7d3;
  color: #287755;
  background: #edfaf4;
}

.answer-feedback > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.answer-feedback > div > span {
  display: grid;
  flex: 0 0 auto;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  background: #d36c62;
  font-size: 0.68rem;
  font-weight: 900;
}

.answer-feedback--correct > div > span {
  background: #42ae79;
}

.answer-feedback p {
  display: grid;
  gap: 2px;
  margin: 0;
  font-size: 0.65rem;
}

.answer-feedback button {
  flex: 0 0 auto;
  min-height: 35px;
  padding: 7px 10px;
  border: 0;
  border-radius: 9px;
  color: #ffffff;
  background: #347fa8;
  font-size: 0.65rem;
  font-weight: 850;
}

.result-card {
  display: grid;
  min-height: 410px;
  place-items: center;
  align-content: center;
  padding: 28px;
  border: 1px solid #dbe8f0;
  border-radius: 19px;
  background:
    radial-gradient(circle at 50% 20%, rgb(255 218 106 / 17%), transparent 33%),
    #ffffff;
  text-align: center;
}

.result-card > span {
  font-size: 3.4rem;
}

.result-card small {
  margin-top: 12px;
  color: #8498aa;
  font-size: 0.65rem;
  font-weight: 800;
}

.result-card > strong {
  color: #2e5873;
  font-size: 2.5rem;
}

.result-card p {
  max-width: 360px;
  margin: 8px 0 16px;
  color: #708597;
  font-size: 0.75rem;
  line-height: 1.65;
}

.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.confetti i {
  position: absolute;
  top: 45%;
  left: 50%;
  width: 7px;
  height: 11px;
  border-radius: 2px;
  background: #4eb9e1;
  animation: confetti-burst 800ms ease-out forwards;
  transform: rotate(calc(var(--piece, 1) * 23deg));
}

.confetti i:nth-child(3n) { background: #f3be4e; }
.confetti i:nth-child(3n + 1) { background: #55bd8c; }
.confetti i:nth-child(1) { --x: -130px; --y: -65px; }
.confetti i:nth-child(2) { --x: -100px; --y: 55px; }
.confetti i:nth-child(3) { --x: -75px; --y: -92px; }
.confetti i:nth-child(4) { --x: -45px; --y: 78px; }
.confetti i:nth-child(5) { --x: -20px; --y: -72px; }
.confetti i:nth-child(6) { --x: 18px; --y: 72px; }
.confetti i:nth-child(7) { --x: 45px; --y: -86px; }
.confetti i:nth-child(8) { --x: 72px; --y: 65px; }
.confetti i:nth-child(9) { --x: 96px; --y: -68px; }
.confetti i:nth-child(10) { --x: 125px; --y: 48px; }
.confetti i:nth-child(11) { --x: 145px; --y: -40px; }
.confetti i:nth-child(12) { --x: -145px; --y: 34px; }

@keyframes confetti-burst {
  to {
    opacity: 0;
    transform: translate(var(--x), var(--y)) rotate(520deg);
  }
}

@media (max-width: 560px) {
  .game-hero {
    align-items: flex-start;
  }

  .clue-metrics,
  .choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .answer-feedback {
    align-items: stretch;
    flex-direction: column;
  }

  .answer-feedback button {
    width: 100%;
  }
}
</style>
