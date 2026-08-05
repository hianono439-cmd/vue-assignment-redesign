<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { motion, MotionConfig, useScroll } from 'motion-v'
import UnitToggler from './components/exercise/UnitToggler.vue'
import WeatherAssistant from './components/exercise/WeatherAssistant.vue'

const { scrollYProgress } = useScroll()
const route = useRoute()
const isHome = computed(() => route.name === 'weather-home')
const isMobileMenuOpen = ref(false)

// 다른 페이지로 이동하면 모바일 메뉴를 자동으로 닫는다.
watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false
  },
)
</script>

<template>
  <el-config-provider size="default" :z-index="3000">
    <MotionConfig reduced-motion="user">
    <motion.div
      class="scroll-progress"
      :style="{ scaleX: scrollYProgress }"
      aria-hidden="true"
    />

    <div class="page-shell">
      <motion.header
        class="app-header"
        :class="{ 'app-header--overlay': isHome }"
        :initial="{ opacity: 0, y: -14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
      >
        <RouterLink class="brand" to="/" aria-label="나갈까 홈">
          <span class="brand-mark" aria-hidden="true">N</span>
          <span class="brand-copy">
            <strong id="page-title">나갈까</strong>
            <small>날씨에 맞춘 가까운 나들이</small>
          </span>
        </RouterLink>

        <button
          type="button"
          class="mobile-menu-toggle"
          :class="{ 'mobile-menu-toggle--open': isMobileMenuOpen }"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="main-navigation"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <span class="mobile-menu-icon" aria-hidden="true">
            <i></i>
            <i></i>
          </span>
          {{ isMobileMenuOpen ? '닫기' : '메뉴' }}
        </button>

        <nav
          id="main-navigation"
          class="navigation"
          :class="{ 'navigation--open': isMobileMenuOpen }"
          aria-label="주요 메뉴"
        >
          <div class="navigation-links">
            <RouterLink to="/outings">나들이 추천</RouterLink>
            <RouterLink to="/">국내 날씨</RouterLink>
            <RouterLink to="/world">세계 날씨</RouterLink>
            <RouterLink to="/game">날씨 게임</RouterLink>
            <RouterLink to="/about">소개</RouterLink>
            <RouterLink to="/signup">회원가입</RouterLink>
          </div>
          <UnitToggler />
        </nav>
      </motion.header>

      <main
        class="weather-app"
        :class="{ 'weather-app--home': isHome }"
        aria-labelledby="page-title"
      >
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <footer class="site-footer">
        <div>
          <strong>나갈까</strong>
          <p>날씨와 가까운 행사를 함께 확인합니다.</p>
        </div>
        <p>날씨 · 행사 · 이동시간</p>
      </footer>
    </div>

      <WeatherAssistant />
    </MotionConfig>
  </el-config-provider>
</template>

<style scoped>
.page-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  background: #f2f0ea;
}

.scroll-progress {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: #ed7c52;
  transform-origin: 0 50%;
  pointer-events: none;
}

.page-shell::before {
  position: absolute;
  z-index: -2;
  top: -240px;
  right: -210px;
  width: 620px;
  height: 620px;
  border-radius: 999px;
  background-image:
    radial-gradient(circle, rgb(237 124 82 / 15%), rgb(237 124 82 / 0%) 68%);
  content: '';
  pointer-events: none;
}

.weather-app {
  width: min(100% - 40px, 1160px);
  min-height: calc(100vh - 220px);
  margin: 0 auto;
  padding: 34px 0 78px;
}

.weather-app--home {
  width: 100%;
  padding-top: 0;
}

.app-header {
  position: relative;
  z-index: 85;
  display: flex;
  width: min(100% - 40px, 1160px);
  min-height: 92px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  border-bottom: 1px solid rgb(31 42 43 / 17%);
}

.app-header--overlay {
  /* 메인 화면에서는 헤더를 날씨 배경 위에 고정한다. */
  position: fixed;
  top: 3px;
  right: 0;
  left: 0;
  width: 100%;
  min-height: 82px;
  padding-inline: max(20px, calc((100vw - 1160px) / 2));
  border-color: rgb(255 255 255 / 22%);
  color: #ffffff;
  background: linear-gradient(to bottom, rgb(16 25 27 / 66%), transparent);
  backdrop-filter: blur(4px);
}

.app-header--overlay .brand {
  color: #ffffff;
}

.app-header--overlay .brand-mark {
  border: 1px solid rgb(255 255 255 / 36%);
  background: rgb(255 255 255 / 12%);
}

.app-header--overlay .brand-copy small,
.app-header--overlay .navigation-links a {
  color: rgb(255 255 255 / 68%);
}

.app-header--overlay .navigation-links a:hover,
.app-header--overlay .navigation-links a:focus-visible {
  color: #ffffff;
}

.app-header--overlay .navigation-links .router-link-exact-active {
  color: #f3a27f;
}

.app-header--overlay :deep(.unit-toggler) {
  border-color: rgb(255 255 255 / 22%);
}

.app-header--overlay :deep(.current-unit small),
.app-header--overlay :deep(.current-unit strong) {
  color: rgb(255 255 255 / 72%);
}

.app-header--overlay :deep(.unit-toggler button) {
  border: 1px solid rgb(255 255 255 / 28%);
  background: rgb(255 255 255 / 12%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #1d292a;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  width: 37px;
  height: 37px;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: #1d292a;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  font-style: italic;
}

.brand-copy {
  display: grid;
  gap: 1px;
}

.brand-copy strong {
  font-size: 1.25rem;
  letter-spacing: -0.055em;
  line-height: 1;
}

.brand-copy strong span,
.site-footer strong span {
  color: #ed7c52;
}

.brand-copy small {
  color: #687372;
  font-size: 0.45rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.navigation {
  display: flex;
  align-items: center;
  gap: 17px;
}

.mobile-menu-toggle {
  display: none;
}

.navigation-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.navigation-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 9px;
  color: #66716f;
  font-size: 0.68rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    color 150ms ease,
    transform 150ms ease;
}

.navigation-links a:hover,
.navigation-links a:focus-visible {
  color: #1d292a;
  outline: none;
  transform: translateY(-1px);
}

.navigation-links .router-link-exact-active {
  color: #df6740;
}

.site-footer {
  display: flex;
  width: min(100% - 40px, 1160px);
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 0 auto;
  padding: 28px 0 36px;
  border-top: 1px solid rgb(31 42 43 / 17%);
  color: #67716f;
}

.site-footer div {
  display: grid;
  gap: 5px;
}

.site-footer strong {
  color: #1d292a;
  font-size: 1rem;
}

.site-footer p {
  margin: 0;
  font-size: 0.59rem;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@media (max-width: 900px) {
  /* 작은 화면에서는 전체 메뉴 대신 메뉴 버튼을 사용한다. */
  .app-header {
    min-height: 72px;
    align-items: center;
    padding: 10px 0;
    flex-direction: row;
    gap: 16px;
  }

  .app-header--overlay {
    min-height: 72px;
    padding-inline: 20px;
    background: linear-gradient(to bottom, rgb(16 25 27 / 88%), rgb(16 25 27 / 18%));
  }

  .mobile-menu-toggle {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-left: auto;
    padding: 8px 12px;
    border: 1px solid rgb(31 42 43 / 18%);
    border-radius: 999px;
    color: #263332;
    background: rgb(255 255 255 / 62%);
    font-size: 0.68rem;
    font-weight: 800;
    cursor: pointer;
  }

  .app-header--overlay .mobile-menu-toggle {
    border-color: rgb(255 255 255 / 32%);
    color: #ffffff;
    background: rgb(255 255 255 / 12%);
  }

  .mobile-menu-icon {
    display: grid;
    width: 15px;
    gap: 4px;
  }

  .mobile-menu-icon i {
    display: block;
    width: 100%;
    height: 1px;
    background: currentcolor;
    transition: transform 160ms ease;
  }

  .mobile-menu-toggle--open .mobile-menu-icon i:first-child {
    transform: translateY(2.5px) rotate(45deg);
  }

  .mobile-menu-toggle--open .mobile-menu-icon i:last-child {
    transform: translateY(-2.5px) rotate(-45deg);
  }

  .navigation {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    display: none;
    width: min(330px, calc(100vw - 40px));
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgb(31 42 43 / 13%);
    border-radius: 18px;
    color: #263332;
    background: rgb(247 244 237 / 98%);
    box-shadow: 0 18px 45px rgb(19 31 32 / 22%);
  }

  .app-header--overlay .navigation {
    right: 20px;
  }

  .navigation--open {
    display: flex;
  }

  .navigation-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }

  .navigation-links a {
    width: 100%;
    justify-content: flex-start;
    border-radius: 10px;
  }

  .navigation-links a:hover,
  .navigation-links a:focus-visible {
    background: rgb(237 124 82 / 9%);
    transform: none;
  }

  .app-header--overlay .navigation-links a {
    color: #66716f;
  }

  .app-header--overlay .navigation-links .router-link-exact-active {
    color: #df6740;
  }

  .app-header--overlay :deep(.navigation .unit-toggler) {
    border-color: rgb(31 42 43 / 14%);
  }

  .app-header--overlay :deep(.navigation .current-unit small) {
    color: #89918f;
  }

  .app-header--overlay :deep(.navigation .current-unit strong) {
    color: #263332;
  }

  .app-header--overlay :deep(.navigation .unit-toggler button) {
    border-color: transparent;
    background: #263332;
  }
}

@media (max-width: 620px) {
  .weather-app,
  .app-header,
  .site-footer {
    width: min(100% - 28px, 1160px);
  }

  .weather-app {
    padding-top: 20px;
  }

  .weather-app--home {
    width: 100%;
    padding-top: 0;
  }

  .navigation-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .navigation-links a {
    width: 100%;
    padding-inline: 10px;
    font-size: 0.66rem;
  }

  .site-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
