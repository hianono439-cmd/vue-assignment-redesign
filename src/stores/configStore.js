import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  // API 원본 데이터는 섭씨로 보관하고 화면에 표시할 단위만 관리한다.
  state: () => ({
    unit: 'celsius',
  }),

  getters: {
    unitSymbol: (state) => (state.unit === 'celsius' ? '°C' : '°F'),
  },

  actions: {
    // 단위 변경 버튼을 누를 때 섭씨와 화씨를 번갈아 설정한다.
    toggleUnit() {
      this.unit = this.unit === 'celsius' ? 'fahrenheit' : 'celsius'
    },
  },
})
