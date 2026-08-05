import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'

// Vue 앱에 전역 Store, Router, Element Plus를 등록한다.
createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus, { size: 'default', zIndex: 3000 })
  .mount('#app')
