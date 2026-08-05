import { createRouter, createWebHashHistory } from 'vue-router'

// 각 URL과 화면 컴포넌트를 연결한다.
const routes = [
  {
    path: '/',
    name: 'weather-home',
    component: () => import('../views/WeatherHomeView.vue'),
  },
  {
    path: '/about',
    name: 'weather-about',
    component: () => import('../views/WeatherAboutView.vue'),
  },
  {
    path: '/world',
    name: 'world-weather',
    component: () => import('../views/WorldWeatherView.vue'),
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../views/SignUpView.vue'),
  },
  {
    path: '/weather/:cityId',
    name: 'weather-detail',
    component: () => import('../views/WeatherDetailView.vue'),
  },
  {
    path: '/game',
    name: 'weather-game',
    component: () => import('../views/WeatherGameView.vue'),
  },
  {
    path: '/outings',
    name: 'outing-recommendations',
    component: () => import('../views/OutingRecommendationsView.vue'),
  },
  {
    // 등록되지 않은 주소는 404 화면으로 보낸다.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  // GitHub Pages에서 새로고침해도 경로가 유지되도록 Hash 방식을 사용한다.
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
