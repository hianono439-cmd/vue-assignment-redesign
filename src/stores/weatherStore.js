import { defineStore } from 'pinia'
import { cityDefinitions, findWeatherCity } from '../data/weather'
import {
  fetchCurrentWeather,
  getWeatherApiErrorMessage,
} from '../services/weatherApi'

export const useWeatherStore = defineStore('weather', {
  // 도시별 데이터와 로딩·오류 상태를 한곳에서 관리한다.
  state: () => ({
    weatherById: {},
    loadingCities: {},
    cityErrors: {},
    isLoadingAll: false,
    errorMessage: '',
    lastUpdated: null,
  }),

  getters: {
    weatherList: (state) =>
      cityDefinitions
        .map((city) => state.weatherById[city.id])
        .filter(Boolean),
    getWeatherById: (state) => (cityId) =>
      state.weatherById[cityId] ?? null,
    getCityError: (state) => (cityId) => state.cityErrors[cityId] ?? '',
    isCityLoading: (state) => (cityId) =>
      Boolean(state.loadingCities[cityId]),
  },

  actions: {
    // 여러 도시 요청은 동시에 보내고, 일부 실패해도 성공한 결과는 화면에 표시한다.
    async loadAll({ force = false } = {}) {
      this.isLoadingAll = true
      this.errorMessage = ''

      const requests = cityDefinitions.map((city) => {
        if (!force && this.weatherById[city.id]) {
          return Promise.resolve(this.weatherById[city.id])
        }

        return fetchCurrentWeather(city)
      })

      const results = await Promise.allSettled(requests)
      let successCount = 0
      let firstError = null

      results.forEach((result, index) => {
        const cityId = cityDefinitions[index].id

        if (result.status === 'fulfilled') {
          this.weatherById[cityId] = result.value
          successCount += 1
          return
        }

        firstError ??= result.reason
      })

      const failureCount = cityDefinitions.length - successCount

      if (successCount > 0) {
        this.lastUpdated = Date.now()
      }

      if (failureCount === cityDefinitions.length) {
        this.errorMessage = getWeatherApiErrorMessage(firstError)
      } else if (failureCount > 0) {
        this.errorMessage = `${failureCount}개 도시의 정보를 불러오지 못했습니다.`
      }

      this.isLoadingAll = false
      return this.weatherList
    },

    // 상세 화면에서는 필요한 도시 한 곳만 요청한다.
    async loadCity(cityId, { force = false } = {}) {
      const cityDefinition = findWeatherCity(cityId)

      if (!cityDefinition) {
        return null
      }

      // 이미 받은 데이터는 강제 새로고침이 아닐 때 다시 요청하지 않는다.
      if (!force && this.weatherById[cityId]) {
        return this.weatherById[cityId]
      }

      this.loadingCities[cityId] = true
      this.cityErrors[cityId] = ''

      try {
        const weather = await fetchCurrentWeather(cityDefinition)
        this.weatherById[cityId] = weather
        this.lastUpdated = Date.now()
        return weather
      } catch (error) {
        this.cityErrors[cityId] = getWeatherApiErrorMessage(error)
        throw error
      } finally {
        this.loadingCities[cityId] = false
      }
    },
  },
})
