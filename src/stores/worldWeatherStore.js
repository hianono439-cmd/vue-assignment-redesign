import { defineStore } from 'pinia'
import { worldCityDefinitions } from '../data/worldCities'
import {
  fetchCurrentWeather,
  getWeatherApiErrorMessage,
} from '../services/weatherApi'

export const useWorldWeatherStore = defineStore('worldWeather', {
  state: () => ({
    weatherById: {},
    isLoading: false,
    errorMessage: '',
    lastUpdated: null,
  }),

  getters: {
    weatherList: (state) =>
      worldCityDefinitions
        .map((city) => state.weatherById[city.id])
        .filter(Boolean),
  },

  actions: {
    // 세계 도시도 동시에 요청하며 일부 실패한 도시는 제외하고 표시한다.
    async loadAll({ force = false } = {}) {
      if (this.isLoading) return this.weatherList

      this.isLoading = true
      this.errorMessage = ''

      const requests = worldCityDefinitions.map((city) => {
        if (!force && this.weatherById[city.id]) {
          return Promise.resolve(this.weatherById[city.id])
        }
        return fetchCurrentWeather(city)
      })

      const results = await Promise.allSettled(requests)
      let successCount = 0
      let firstError = null

      results.forEach((result, index) => {
        const cityId = worldCityDefinitions[index].id

        if (result.status === 'fulfilled') {
          this.weatherById[cityId] = result.value
          successCount += 1
          return
        }

        firstError ??= result.reason
      })

      const failureCount = worldCityDefinitions.length - successCount

      if (successCount > 0) this.lastUpdated = Date.now()

      if (failureCount === worldCityDefinitions.length) {
        this.errorMessage = getWeatherApiErrorMessage(firstError)
      } else if (failureCount > 0) {
        this.errorMessage = `${failureCount}개 도시의 날씨를 불러오지 못했습니다.`
      }

      this.isLoading = false
      return this.weatherList
    },
  },
})
