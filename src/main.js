import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles.css'

// Vue 앱에서 공통으로 사용할 Store와 Router를 등록한다.
createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
