import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    // 실제 사용하는 Element Plus API와 컴포넌트 및 스타일만 번들에 포함한다.
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
  ],
  base: command === 'build' ? '/vue-assignment-redesign/' : '/',
}))
