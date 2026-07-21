<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCourse } from '../config'
import VideoQuizPlayer from '../components/VideoQuizPlayer.vue'

/**
 * 播放页：只有播放功能与返回。
 * 视频与试题一一对应，按路由 courseId 加载对应配置。
 */
const route = useRoute()
const router = useRouter()

const course = computed(() => getCourse(route.params.courseId as string))

// 课程不存在则回首页
watch(
  course,
  (c) => {
    if (!c) router.replace({ name: 'home' })
  },
  { immediate: true },
)

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="page">
    <VideoQuizPlayer
      v-if="course"
      :key="course.id"
      :course="course"
      @back="goHome"
    />
  </div>
</template>

<style scoped>
.page {
  width: min(1160px, 96vw);
  display: flex;
  flex-direction: column;
}
</style>
