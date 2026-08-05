<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { cityDefinitions } from '../data/weather'
import { worldCityDefinitions } from '../data/worldCities'
import { useMemberStore } from '../stores/memberStore'

const router = useRouter()
const memberStore = useMemberStore()
const formRef = ref(null)
const isSubmitting = ref(false)
const isCompleted = ref(memberStore.isRegistered)

const cityOptionGroups = [
  {
    label: '국내 주요 도시',
    cities: cityDefinitions.map((city) => city.name),
  },
  {
    label: '세계 주요 도시',
    cities: worldCityDefinitions.map((city) => city.name),
  },
]

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteCity: '서울',
  weatherNotice: true,
  terms: false,
})

const validatePassword = (_rule, value, callback) => {
  const hasLetter = /[A-Za-z]/.test(value)
  const hasNumber = /\d/.test(value)

  if (!value) {
    callback(new Error('비밀번호를 입력해 주세요.'))
    return
  }
  if (value.length < 8 || !hasLetter || !hasNumber) {
    callback(new Error('영문과 숫자를 포함해 8자 이상 입력해 주세요.'))
    return
  }
  callback()
}

const validatePasswordConfirm = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('비밀번호를 한 번 더 입력해 주세요.'))
    return
  }
  if (value !== form.password) {
    callback(new Error('입력한 비밀번호가 서로 다릅니다.'))
    return
  }
  callback()
}

const validateTerms = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('서비스 이용 안내에 동의해 주세요.'))
    return
  }
  callback()
}

const rules = {
  name: [
    { required: true, message: '이름을 입력해 주세요.', trigger: 'blur' },
    { min: 2, max: 20, message: '이름은 2~20자로 입력해 주세요.', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '이메일을 입력해 주세요.', trigger: 'blur' },
    { type: 'email', message: '올바른 이메일 형식으로 입력해 주세요.', trigger: ['blur', 'change'] },
  ],
  password: [{ validator: validatePassword, trigger: ['blur', 'change'] }],
  confirmPassword: [
    { validator: validatePasswordConfirm, trigger: ['blur', 'change'] },
  ],
  favoriteCity: [
    { required: true, message: '관심 도시를 선택해 주세요.', trigger: 'change' },
  ],
  terms: [{ validator: validateTerms, trigger: 'change' }],
}

const joinedDate = computed(() => {
  if (!memberStore.member?.joinedAt) return ''
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(
    new Date(memberStore.member.joinedAt),
  )
})

const submitForm = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return

    isSubmitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 550))

    memberStore.register({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      favoriteCity: form.favoriteCity,
    })

    form.password = ''
    form.confirmPassword = ''
    isSubmitting.value = false
    isCompleted.value = true
    ElMessage.success('회원가입이 완료되었습니다.')
  })
}

const resetForm = () => {
  formRef.value?.resetFields()
}

const registerAgain = () => {
  memberStore.clearMember()
  isCompleted.value = false
  Object.assign(form, {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    favoriteCity: '서울',
    weatherNotice: true,
    terms: false,
  })
}
</script>

<template>
  <section class="signup-view" aria-labelledby="signup-heading">
    <div class="signup-intro">
      <span aria-hidden="true">👤</span>
      <p>회원 정보 등록</p>
      <h2 id="signup-heading">나갈까 회원가입</h2>
      <strong>자주 확인할 도시를 미리 선택하세요.</strong>

      <ol>
        <li><span>1</span>기본 정보 입력</li>
        <li><span>2</span>관심 도시 선택</li>
        <li><span>3</span>입력값 확인</li>
      </ol>
    </div>

    <el-card v-if="!isCompleted" class="signup-card" shadow="never">
      <el-form
        ref="formRef"
        class="signup-form"
        :model="form"
        :rules="rules"
        label-position="top"
        status-icon
        scroll-to-error
        @submit.prevent="submitForm"
      >
        <div class="two-column-fields">
          <el-form-item label="이름" prop="name">
            <el-input
              v-model.trim="form.name"
              maxlength="20"
              show-word-limit
              autocomplete="name"
              placeholder="이름을 입력해 주세요"
            />
          </el-form-item>

          <el-form-item label="이메일" prop="email">
            <el-input
              v-model.trim="form.email"
              type="email"
              autocomplete="email"
              placeholder="weather@example.com"
            />
          </el-form-item>
        </div>

        <div class="two-column-fields">
          <el-form-item label="비밀번호" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="영문과 숫자 포함 8자 이상"
            />
          </el-form-item>

          <el-form-item label="비밀번호 확인" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="비밀번호를 다시 입력해 주세요"
            />
          </el-form-item>
        </div>

        <el-form-item label="관심 도시" prop="favoriteCity">
          <el-select
            v-model="form.favoriteCity"
            class="city-select"
            filterable
            placeholder="도시를 선택해 주세요"
          >
            <el-option-group
              v-for="group in cityOptionGroups"
              :key="group.label"
              :label="group.label"
            >
              <el-option
                v-for="city in group.cities"
                :key="city"
                :label="city"
                :value="city"
              />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.weatherNotice">
            관심 도시를 나들이 도우미에서 사용합니다.
          </el-checkbox>
        </el-form-item>

        <el-form-item prop="terms">
          <el-checkbox v-model="form.terms">
            입력한 정보가 이 브라우저에만 저장되는 것에 동의합니다.
          </el-checkbox>
        </el-form-item>

        <div class="form-actions">
          <el-button type="primary" :loading="isSubmitting" @click="submitForm">
            회원가입
          </el-button>
          <el-button :disabled="isSubmitting" @click="resetForm">다시 입력</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card v-else class="signup-result" shadow="never">
      <el-result
        icon="success"
        title="회원가입이 완료되었습니다"
        :sub-title="`${memberStore.member?.name}님의 회원 정보가 저장되었습니다.`"
      >
        <template #extra>
          <div class="member-summary">
            <div><span>이메일</span><strong>{{ memberStore.member?.email }}</strong></div>
            <div><span>관심 도시</span><strong>{{ memberStore.member?.favoriteCity }}</strong></div>
            <div><span>가입일</span><strong>{{ joinedDate }}</strong></div>
          </div>
          <div class="result-actions">
            <el-button type="primary" @click="router.push('/outings')">나들이 추천받기</el-button>
            <el-button @click="registerAgain">다시 가입하기</el-button>
          </div>
        </template>
      </el-result>
    </el-card>
  </section>
</template>

<style scoped>
.signup-view {
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.28fr);
  gap: 18px;
  padding-top: 24px;
}

.signup-intro {
  align-self: start;
  padding: 24px;
  border-radius: 4px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 8%, rgb(237 124 82 / 35%), transparent 34%),
    linear-gradient(145deg, #1f2b2c, #3b4441);
  box-shadow: 0 18px 38px rgb(31 43 44 / 14%);
}

.signup-intro > span {
  display: grid;
  width: 47px;
  height: 47px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 14px;
  background: rgb(255 255 255 / 10%);
  font-size: 1.4rem;
}

.signup-intro > p {
  margin: 17px 0 4px;
  color: #ef9e78;
  font-size: 0.62rem;
  font-weight: 850;
}

.signup-intro h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.035em;
}

.signup-intro > strong {
  display: block;
  margin-top: 8px;
  color: rgb(255 255 255 / 66%);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.6;
}

.signup-intro ol {
  display: grid;
  gap: 9px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.signup-intro li {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border-radius: 11px;
  background: rgb(255 255 255 / 8%);
  color: #d8eaed;
  font-size: 0.68rem;
  font-weight: 750;
}

.signup-intro li span {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  background: #ed7c52;
  font-size: 0.6rem;
}

.signup-card,
.signup-result {
  border-color: rgb(31 42 43 / 13%);
  border-radius: 4px;
}

.signup-card :deep(.el-card__body) {
  padding: 22px;
}

.signup-form {
  margin-top: 19px;
}

.signup-form :deep(.el-form-item__label) {
  color: #4a687d;
  font-size: 0.7rem;
  font-weight: 800;
}

.signup-form :deep(.el-input__wrapper),
.signup-form :deep(.el-select__wrapper) {
  min-height: 41px;
  border-radius: 4px;
}

.two-column-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.city-select {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.form-actions :deep(.el-button) {
  min-width: 110px;
}

.signup-result {
  align-self: stretch;
}

.signup-result :deep(.el-card__body) {
  display: grid;
  min-height: 520px;
  place-items: center;
}

.member-summary {
  display: grid;
  width: min(100%, 390px);
  gap: 7px;
  margin: 0 auto 16px;
  text-align: left;
}

.member-summary div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 11px;
  border-radius: 4px;
  background: #f3f1eb;
  font-size: 0.67rem;
}

.member-summary span {
  color: #8397a7;
}

.member-summary strong {
  overflow: hidden;
  color: #44647a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 760px) {
  .signup-view {
    grid-template-columns: 1fr;
  }

  .signup-intro ol {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .signup-intro ol,
  .two-column-fields {
    grid-template-columns: 1fr;
  }

  .form-actions,
  .result-actions {
    flex-direction: column;
  }

  .form-actions :deep(.el-button),
  .result-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
