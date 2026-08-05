import { computed, toValue } from 'vue'
import { useConfigStore } from '../stores/configStore'

export const useTemperature = (temperatureSource) => {
  const configStore = useConfigStore()

  // 같은 변환 코드를 여러 화면에서 반복하지 않도록 computed로 묶는다.
  const displayTemp = computed(() => {
    const rawTemp = Number(toValue(temperatureSource))

    if (!Number.isFinite(rawTemp)) {
      return '—'
    }

    if (configStore.unit === 'fahrenheit') {
      return Math.round((rawTemp * 9) / 5 + 32)
    }

    return rawTemp
  })

  const unitSymbol = computed(() => configStore.unitSymbol)

  return {
    displayTemp,
    unitSymbol,
  }
}
