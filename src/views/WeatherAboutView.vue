<script setup>
import { RouterLink } from 'vue-router'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
</script>

<template>
  <section class="about-view" aria-labelledby="about-heading">
    <div class="view-heading">
      <span aria-hidden="true">ⓘ</span>
      <div>
        <p>서비스 안내</p>
        <h2 id="about-heading">나갈까 소개</h2>
      </div>
    </div>

    <BaseDashboardCard
      title="나갈까 이용 방법"
      icon="↗"
      heading-id="about-service-heading"
    >
      <p class="intro">
        나갈까는 현재 날씨와 예상 이동시간을 기준으로
        진행 중인 행사와 전시를 보여줍니다.
      </p>

      <ul class="feature-list">
        <li>
          <span aria-hidden="true">🔎</span>
          <div>
            <strong>출발 위치 설정</strong>
            <p>도시를 선택하거나 현재 위치를 이용해 가까운 일정을 찾습니다.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">🌐</span>
          <div>
            <strong>날씨 확인</strong>
            <p>기온과 비·눈, 바람, 실내 여부를 함께 확인합니다.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">🧭</span>
          <div>
            <strong>지금 열리는 행사</strong>
            <p>현재 진행 중이며 설정한 운전시간 안에 도착할 수 있는 곳만 보여줍니다.</p>
          </div>
        </li>
      </ul>
    </BaseDashboardCard>

    <RouterLink class="home-link" to="/">
      <span aria-hidden="true">←</span> 나갈까 홈으로 돌아가기
    </RouterLink>
  </section>
</template>

<style scoped>
.about-view {
  padding-top: 24px;
}

.view-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 4px 3px 0;
}

.view-heading > span {
  display: grid;
  width: 45px;
  height: 45px;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: #ed7c52;
  font-size: 1.25rem;
  font-weight: 850;
  box-shadow: none;
}

.view-heading p {
  margin: 0 0 3px;
  color: #d96a45;
  font-size: 0.63rem;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.view-heading h2 {
  margin: 0;
  color: #263332;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
}

.intro {
  margin: 0;
  color: #60758a;
  font-size: 0.9rem;
  line-height: 1.75;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.feature-list li {
  padding: 18px;
  border: 1px solid rgb(31 42 43 / 13%);
  border-radius: 4px;
  background: rgb(255 255 255 / 72%);
}

.feature-list li > span {
  display: block;
  margin-bottom: 10px;
  font-size: 1.45rem;
}

.feature-list strong {
  color: #263332;
  font-size: 0.87rem;
}

.feature-list p {
  margin: 7px 0 0;
  color: #71869a;
  font-size: 0.74rem;
  line-height: 1.6;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin-top: 16px;
  padding: 9px 15px;
  border-radius: 999px;
  color: #ffffff;
  background: #263332;
  box-shadow: none;
  font-size: 0.78rem;
  font-weight: 750;
  text-decoration: none;
}

.home-link:hover,
.home-link:focus-visible {
  background: #df6b44;
  outline: 3px solid rgb(237 124 82 / 18%);
}

@media (max-width: 720px) {
  .feature-list {
    grid-template-columns: 1fr;
  }
}
</style>
