import { defineStore } from 'pinia'

const memberStorageKey = 'weather-dashboard-member'

// 새로고침 후에도 회원 정보를 사용할 수 있도록 브라우저 저장값을 읽는다.
const readStoredMember = () => {
  try {
    return JSON.parse(localStorage.getItem(memberStorageKey))
  } catch {
    return null
  }
}

export const useMemberStore = defineStore('member', {
  state: () => ({
    member: readStoredMember(),
  }),

  getters: {
    isRegistered: (state) => Boolean(state.member),
  },

  actions: {
    // 실습용 회원 정보이므로 서버가 아닌 localStorage에 저장한다.
    register(profile) {
      this.member = {
        name: profile.name,
        email: profile.email,
        favoriteCity: profile.favoriteCity,
        joinedAt: new Date().toISOString(),
      }
      localStorage.setItem(memberStorageKey, JSON.stringify(this.member))
    },

    // 다시 가입할 때 기존 브라우저 저장값도 함께 삭제한다.
    clearMember() {
      this.member = null
      localStorage.removeItem(memberStorageKey)
    },
  },
})
