<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useVideoQuiz } from '../composables/useVideoQuiz'
import type { Course } from '../types/quiz'
import QuestionOverlay from './QuestionOverlay.vue'

const props = defineProps<{
  course: Course
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const {
  currentTime,
  duration,
  isPlaying,
  activeQuestion,
  feedback,
  selectedRegionId,
  ended,
  progress,
  answeredCount,
  totalCount,
  play,
  togglePlay,
  answer,
  reset,
} = useVideoQuiz(props.course, videoRef)

/** 是否移动端（用于进入即全屏横屏、避免原生接管） */
const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent)

/** 是否已开始（首帧点击播放，规避浏览器自动播放限制） */
const started = ref(false)
function start() {
  started.value = true
  // 移动端：借本次用户点击手势直接进入全屏（onFsChange 会锁定横屏），
  // 避免 iOS Safari 等将播放接管为原生全屏播放器而绕过答题层。
  if (isMobile) wrapRef.value?.requestFullscreen?.().catch(() => {})
  play()
}

/** 视频舞台容器：整体全屏（连同热区层一起进入全屏，保证对齐） */
const wrapRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
function toggleFullscreen() {
  const el = wrapRef.value
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  } else {
    el.requestFullscreen().catch(() => {})
  }
}
async function onFsChange() {
  const fs = document.fullscreenElement === wrapRef.value
  isFullscreen.value = fs
  // 移动端：全屏时锁定横屏，退出时解锁（桌面端 / 不支持时忽略）
  try {
    const orientation = screen.orientation as unknown as {
      lock?: (o: string) => Promise<void>
      unlock?: () => void
    }
    if (fs) {
      await orientation.lock?.('landscape')
    } else {
      orientation.unlock?.()
    }
  } catch {
    /* 不支持方向锁定时忽略 */
  }
}
onMounted(() => document.addEventListener('fullscreenchange', onFsChange))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFsChange))

/** 视频宽高比，加载后按真实尺寸设置，保证热区与画面精确对齐 */
const videoAspect = ref('16 / 9')
function onMeta(e: Event) {
  const v = e.target as HTMLVideoElement
  if (v.videoWidth && v.videoHeight) {
    videoAspect.value = `${v.videoWidth} / ${v.videoHeight}`
  }
}

/** 数值宽高比 */
const ratio = computed(() => {
  const [w, h] = videoAspect.value.split('/').map((s) => parseFloat(s))
  return h > 0 ? w / h : 16 / 9
})
/**
 * 舞台容器样式：始终保持视频真实宽高比（配合 object-fit:fill 保证热区对齐）。
 * 全屏时按“包含”方式缩放到视口内（宽高取不超出屏幕的最大值），避免拉伸变形。
 */
const wrapStyle = computed(() =>
  isFullscreen.value
    ? { aspectRatio: videoAspect.value, width: `min(100vw, calc(100vh * ${ratio.value}))` }
    : { aspectRatio: videoAspect.value },
)

/** 切换课程时，重置起播状态 */
watch(
  () => props.course.id,
  () => {
    started.value = false
    reset()
    if (videoRef.value) videoRef.value.pause()
  },
)

const canShowPauseBadge = computed(
  () => started.value && !isPlaying.value && !activeQuestion.value && !ended.value,
)

function fmt(sec: number) {
  if (!Number.isFinite(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <div class="stage">
    <!-- 顶部：返回 + 进度条 -->
    <header class="topbar">
      <button class="icon-btn" title="返回" @click="emit('back')">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path
            d="M15 6l-6 6 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <div class="progress" :title="`进度 ${Math.round(progress)}%`">
        <div class="progress__fill" :style="{ width: progress + '%' }" />
      </div>
    </header>

    <!-- 视频舞台 -->
    <div ref="wrapRef" class="video-wrap" :style="wrapStyle">
      <video
        ref="videoRef"
        class="video"
        :src="course.videoSrc"
        playsinline
        webkit-playsinline="true"
        x5-playsinline
        x5-video-player-type="h5-page"
        x5-video-player-fullscreen="false"
        disablepictureinpicture
        disableremoteplayback
        controlslist="nodownload nofullscreen noremoteplayback"
        preload="metadata"
        @loadedmetadata="onMeta"
        @click="started && !activeQuestion && togglePlay()"
      />

      <!-- 开始播放遮罩 -->
      <button v-if="!started" class="start-gate" @click="start">
        <span class="start-gate__btn">
          <svg viewBox="0 0 24 24" width="34" height="34">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        <span class="start-gate__text">{{ course.title }}</span>
      </button>

      <!-- 全屏按钮（连同热区层一起全屏） -->
      <button
        v-if="started && !activeQuestion && !ended"
        class="fs-btn"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        @click="toggleFullscreen"
      >
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="22" height="22">
          <path
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="22" height="22">
          <path
            d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 作答透明热区层 -->
      <QuestionOverlay
        v-if="activeQuestion"
        :question="activeQuestion"
        :feedback="feedback"
        :selected-region-id="selectedRegionId"
        @answer="answer"
      />

      <!-- 暂停中的手动播放提示（非答题、非结束时） -->
      <button
        v-if="canShowPauseBadge"
        class="pause-badge"
        title="继续播放"
        @click="togglePlay"
      >
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </button>

      <!-- 结束遮罩 -->
      <div v-if="ended" class="finish">
        <div class="finish__title">本节完成 🎉</div>
        <div class="finish__sub">答对 {{ answeredCount }} / {{ totalCount }} 题</div>
        <button class="finish__btn" @click="reset">重新开始</button>
      </div>
    </div>

    <!-- 底部：音量 + 信息 -->
    <footer class="bottombar">
      <div class="meta">
        <span class="meta__badge">题目 {{ answeredCount }} / {{ totalCount }}</span>
        <span class="meta__time">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.stage {
  width: 100%;
  background: var(--card);
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  padding: 20px 26px 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部栏 */
.topbar {
  display: flex;
  align-items: center;
  gap: 18px;
}
.icon-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 12px;
  transition: color 0.15s ease, background 0.15s ease;
}
.icon-btn:hover {
  color: var(--ink);
  background: #f1f5f9;
}
.progress {
  flex: 1;
  height: 12px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}
.progress__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--brand), var(--brand-dark));
  transition: width 0.25s ease;
}

/* 视频区域 */
.video-wrap {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: #0b1220;
}
.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}

/* 全屏按钮 + 全屏态 */
.fs-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 8;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(11, 18, 32, 0.5);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fs-btn:hover {
  background: rgba(11, 18, 32, 0.72);
}
.video-wrap:fullscreen {
  position: fixed;
  inset: 0;
  margin: auto;
  height: auto;
  border-radius: 0;
}
.video-wrap::backdrop {
  background: #000;
}

/* 开始遮罩 */
.start-gate {
  position: absolute;
  inset: 0;
  z-index: 8;
  border: none;
  background: rgba(11, 18, 32, 0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.start-gate__btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.5);
}
.start-gate__text {
  font-size: 18px;
  font-weight: 700;
}

/* 暂停提示按钮 */
.pause-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 7;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--brand-dark);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

/* 结束遮罩 */
.finish {
  position: absolute;
  inset: 0;
  z-index: 9;
  background: rgba(11, 18, 32, 0.72);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.finish__title {
  font-size: 26px;
  font-weight: 800;
}
.finish__sub {
  color: #d1d5db;
}
.finish__btn {
  margin-top: 8px;
  border: none;
  background: var(--brand);
  color: #fff;
  padding: 10px 26px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

/* 底部栏 */
.bottombar {
  display: flex;
  align-items: center;
  gap: 16px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}
.meta__badge {
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}
</style>
