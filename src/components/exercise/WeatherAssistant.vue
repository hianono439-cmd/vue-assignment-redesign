<script setup>
import { nextTick, ref, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { RouterLink } from 'vue-router'
import { useWeatherAssistant } from '../../composables/useWeatherAssistant'
import { useMemberStore } from '../../stores/memberStore'

const isOpen = ref(false)
const messageList = ref(null)
const suggestionList = ref(null)
const inputElement = ref(null)
const memberStore = useMemberStore()
const {
  messages,
  draft,
  isThinking,
  suggestedQuestions,
  sendMessage,
  clearConversation,
} = useWeatherAssistant()

const scrollToLatestMessage = async () => {
  await nextTick()
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

const openAssistant = async () => {
  isOpen.value = true
  await nextTick()
  inputElement.value?.focus({ preventScroll: true })
}

const closeAssistant = () => {
  isOpen.value = false
}

const askSuggestedQuestion = (question) => {
  sendMessage(question)
}

const keepSuggestionScrollInPanel = (event) => {
  if (!suggestionList.value) return

  const isHorizontalGesture =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
    (event.shiftKey && Math.abs(event.deltaY) > 0)

  if (!isHorizontalGesture) return

  event.preventDefault()
  suggestionList.value.scrollLeft += event.deltaX || event.deltaY
}

watch(
  () => [messages.value.length, isThinking.value],
  scrollToLatestMessage,
)
</script>

<template>
  <div class="assistant-layer">
    <AnimatePresence>
      <motion.aside
        v-if="isOpen"
        id="weather-assistant-panel"
        class="assistant-panel"
        role="dialog"
        aria-labelledby="assistant-heading"
        :initial="{ opacity: 0, y: 22, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 14, scale: 0.97 }"
        :transition="{ type: 'spring', stiffness: 320, damping: 27 }"
        @keydown.esc="closeAssistant"
      >
        <header class="assistant-header">
          <div class="assistant-identity">
            <motion.span
              :animate="{ rotate: [0, 8, -8, 0] }"
              :transition="{ duration: 2.8, repeat: Infinity, repeatDelay: 2 }"
              aria-hidden="true"
            >☁</motion.span>
            <div>
              <p>
                {{ memberStore.member ? `${memberStore.member.name}님의 관심 도시` : '날씨와 나들이 정보' }}
              </p>
              <h2 id="assistant-heading">나들이 도우미</h2>
            </div>
          </div>
          <div class="assistant-controls">
            <button type="button" aria-label="대화 초기화" @click="clearConversation">↻</button>
            <button type="button" aria-label="나들이 도우미 닫기" @click="closeAssistant">×</button>
          </div>
        </header>

        <div class="privacy-note">
          <span aria-hidden="true"></span>
          날씨와 관심 도시, 진행 중인 행사를 함께 확인할 수 있습니다.
        </div>

        <div ref="messageList" class="message-list" aria-live="polite">
          <motion.div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="`message--${message.role}`"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
          >
            <span v-if="message.role === 'assistant'" aria-hidden="true">날씨</span>
            <p>
              {{ message.text }}
              <RouterLink
                v-if="message.action"
                class="message-action"
                :to="message.action.to"
                @click="closeAssistant"
              >
                {{ message.action.label }} <span aria-hidden="true">→</span>
              </RouterLink>
            </p>
          </motion.div>

          <div v-if="isThinking" class="typing-message" aria-label="답변 작성 중">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div
          ref="suggestionList"
          class="suggestion-list"
          aria-label="추천 질문"
          @wheel="keepSuggestionScrollInPanel"
        >
          <button
            v-for="question in suggestedQuestions"
            :key="question"
            type="button"
            :disabled="isThinking"
            @click="askSuggestedQuestion(question)"
          >
            {{ question }}
          </button>
        </div>

        <form class="assistant-form" @submit.prevent="sendMessage()">
          <label class="sr-only" for="assistant-question">날씨 질문 입력</label>
          <input
            id="assistant-question"
            ref="inputElement"
            v-model="draft"
            type="text"
            autocomplete="off"
            placeholder="예: 제주 우산 필요해?"
            :disabled="isThinking"
          />
          <motion.button
            type="submit"
            :disabled="!draft.trim() || isThinking"
            :while-hover="{ scale: 1.04 }"
            :while-press="{ scale: 0.92 }"
            aria-label="질문 보내기"
          >
            ↑
          </motion.button>
        </form>
      </motion.aside>
    </AnimatePresence>

    <motion.button
      v-if="!isOpen"
      class="assistant-launcher"
      type="button"
      aria-controls="weather-assistant-panel"
      :aria-expanded="isOpen"
      :while-hover="{ y: -4, scale: 1.04 }"
      :while-press="{ scale: 0.92 }"
      :transition="{ type: 'spring', stiffness: 360, damping: 22 }"
      @click="openAssistant"
    >
      <span aria-hidden="true">✦</span>
      <strong>나들이 도우미</strong>
      <small>도시 날씨와 가까운 행사를 확인하세요</small>
    </motion.button>
  </div>
</template>

<style scoped>
.assistant-layer {
  position: fixed;
  z-index: 90;
  right: 22px;
  bottom: 22px;
  display: grid;
  justify-items: end;
  gap: 10px;
  pointer-events: none;
}

.assistant-panel,
.assistant-launcher {
  pointer-events: auto;
}

.assistant-panel {
  display: grid;
  width: min(390px, calc(100vw - 28px));
  height: min(610px, calc(100vh - 44px));
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 23px;
  background: rgb(248 252 255 / 97%);
  box-shadow: 0 25px 65px rgb(25 69 103 / 28%);
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  backdrop-filter: blur(24px);
}

.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 17px;
  color: #ffffff;
  background:
    radial-gradient(circle at 90% 10%, rgb(237 124 82 / 38%), transparent 34%),
    linear-gradient(135deg, #1f2b2c, #3b4441);
}

.assistant-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.assistant-identity > span {
  display: grid;
  width: 39px;
  height: 39px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background: rgb(255 255 255 / 12%);
}

.assistant-identity p {
  margin: 0 0 2px;
  color: #a9e0df;
  font-size: 0.51rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.assistant-identity h2 {
  margin: 0;
  font-size: 0.92rem;
}

.assistant-controls {
  display: flex;
  gap: 5px;
}

.assistant-controls button {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 9px;
  color: #ffffff;
  background: rgb(255 255 255 / 10%);
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-bottom: 1px solid #e2edf4;
  color: #758c9f;
  background: #f0f7fa;
  font-size: 0.59rem;
}

.privacy-note span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #3fbc82;
  box-shadow: 0 0 0 4px rgb(63 188 130 / 12%);
}

.message-list {
  display: flex;
  overflow-y: auto;
  padding: 16px;
  flex-direction: column;
  gap: 11px;
  overscroll-behavior: contain;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.message > span {
  display: grid;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 8px;
  color: #ffffff;
  background: linear-gradient(135deg, #41a6db, #48b99a);
  font-size: 0.5rem;
  font-weight: 900;
}

.message p {
  max-width: 84%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 5px 14px 14px 14px;
  color: #526b7f;
  background: #eaf3f8;
  font-size: 0.72rem;
  line-height: 1.65;
}

.message--user {
  justify-content: flex-end;
}

.message--user p {
  border-radius: 14px 5px 14px 14px;
  color: #ffffff;
  background: #263332;
}

.message-action {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px solid #c5dce9;
  border-radius: 8px;
  color: #286b91;
  background: rgb(255 255 255 / 72%);
  font-size: 0.63rem;
  font-weight: 800;
  line-height: 1.2;
  text-decoration: none;
}

.message-action:hover {
  border-color: #78b8d5;
  background: #ffffff;
}

.typing-message {
  display: flex;
  width: fit-content;
  gap: 4px;
  padding: 11px 13px;
  border-radius: 5px 14px 14px 14px;
  background: #eaf3f8;
}

.typing-message span {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #6e9ab4;
  animation: typing 900ms ease-in-out infinite alternate;
}

.typing-message span:nth-child(2) {
  animation-delay: 150ms;
}

.typing-message span:nth-child(3) {
  animation-delay: 300ms;
}

@keyframes typing {
  to { transform: translateY(-4px); opacity: 0.45; }
}

.suggestion-list {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  padding: 9px 13px;
  border-top: 1px solid #e3edf4;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.suggestion-list button {
  flex: none;
  padding: 7px 9px;
  border: 1px solid #d3e4ee;
  border-radius: 999px;
  color: #50728a;
  background: #ffffff;
  font-size: 0.61rem;
  font-weight: 750;
}

.assistant-form {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e3edf4;
  background: #ffffff;
  grid-template-columns: 1fr auto;
}

.assistant-form input {
  min-width: 0;
  height: 43px;
  padding: 0 13px;
  border: 1px solid #c9dce9;
  border-radius: 12px;
  color: #304e66;
  outline: none;
}

.assistant-form input:focus {
  border-color: #3a9ed4;
  box-shadow: 0 0 0 4px rgb(58 158 212 / 11%);
}

.assistant-form > button {
  width: 43px;
  height: 43px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #ed7c52;
  font-size: 1.05rem;
  font-weight: 900;
}

.assistant-form > button:disabled,
.suggestion-list button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.assistant-launcher {
  display: grid;
  min-width: 178px;
  padding: 12px 15px;
  border: 1px solid rgb(255 255 255 / 82%);
  border-radius: 17px;
  color: #ffffff;
  background:
    radial-gradient(circle at 90% 10%, rgb(237 124 82 / 42%), transparent 38%),
    linear-gradient(135deg, #1f2b2c, #3b4441);
  box-shadow: 0 15px 35px rgb(31 43 44 / 25%);
  text-align: left;
  grid-template-columns: auto 1fr;
  column-gap: 9px;
}

.assistant-launcher > span {
  grid-row: span 2;
  align-self: center;
  font-size: 1.25rem;
}

.assistant-launcher strong {
  font-size: 0.75rem;
}

.assistant-launcher small {
  color: #b9e1df;
  font-size: 0.58rem;
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

@media (max-width: 560px) {
  .assistant-layer {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .assistant-panel {
    width: calc(100vw - 24px);
    height: min(640px, calc(100vh - 24px));
  }

  .assistant-launcher {
    width: auto;
    min-width: 150px;
    min-height: 56px;
    align-items: center;
    padding: 8px 15px 8px 10px;
    border-color: rgb(255 255 255 / 72%);
    border-radius: 999px;
    background:
      radial-gradient(circle at 88% 12%, rgb(255 255 255 / 22%), transparent 36%),
      linear-gradient(135deg, #ed7c52, #d95f3a);
    box-shadow:
      0 14px 32px rgb(59 38 31 / 34%),
      0 0 0 4px rgb(237 124 82 / 16%);
    grid-template-columns: 36px auto;
    column-gap: 9px;
  }

  .assistant-launcher > span {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    grid-row: auto;
    border: 1px solid rgb(255 255 255 / 34%);
    border-radius: 50%;
    background: rgb(255 255 255 / 16%);
    font-size: 1.05rem;
  }

  .assistant-launcher strong {
    display: block;
    font-size: 0.78rem;
    letter-spacing: -0.02em;
  }

  .assistant-launcher small {
    display: none;
  }
}
</style>
