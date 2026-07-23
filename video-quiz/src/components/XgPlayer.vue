<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Player from 'xgplayer'
import type { IPlayerOptions } from 'xgplayer'
import 'xgplayer/dist/index.min.css'

/**
 * 西瓜视频（xgplayer）播放器封装：替代原生 <video>，提升缓冲、首帧、
 * 移动端 playsinline 等播放体验，同时把底层 <video> 元素与常用事件暴露出去，
 * 让答题状态机 / 编辑器沿用既有逻辑。
 *
 * - controls=false（默认）：隐藏内置控制条与起播/封面等 UI，交由业务层自绘，
 *   适配「答题闯关」「热区编辑」这类需要精确接管播放的场景。
 * - 通过 @ready 上报底层 <video>，通过 @loadedmetadata/@timeupdate 等透传媒体事件。
 */
const props = withDefaults(
  defineProps<{
    src: string
    controls?: boolean
    muted?: boolean
  }>(),
  { controls: false, muted: false },
)

const emit = defineEmits<{
  (e: 'ready', video: HTMLVideoElement): void
  (e: 'loadedmetadata', video: HTMLVideoElement): void
  (e: 'timeupdate', video: HTMLVideoElement): void
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'ended'): void
}>()

const host = ref<HTMLElement | null>(null)
let player: Player | null = null
let videoEl: HTMLVideoElement | null = null

const onMeta = () => videoEl && emit('loadedmetadata', videoEl)
const onTime = () => videoEl && emit('timeupdate', videoEl)
const onPlay = () => emit('play')
const onPause = () => emit('pause')
const onEnded = () => emit('ended')

function bindVideo(v: HTMLVideoElement) {
  v.addEventListener('loadedmetadata', onMeta)
  v.addEventListener('timeupdate', onTime)
  v.addEventListener('play', onPlay)
  v.addEventListener('pause', onPause)
  v.addEventListener('ended', onEnded)
}
function unbindVideo(v: HTMLVideoElement) {
  v.removeEventListener('loadedmetadata', onMeta)
  v.removeEventListener('timeupdate', onTime)
  v.removeEventListener('play', onPlay)
  v.removeEventListener('pause', onPause)
  v.removeEventListener('ended', onEnded)
}

function buildOptions(): IPlayerOptions {
  return {
    el: host.value!,
    url: props.src,
    fluid: false,
    width: '100%',
    height: '100%',
    // 与原生 object-fit:fill 对齐，保证外层容器按真实宽高比时热区精确覆盖画面
    videoFillMode: 'fill',
    videoInit: true,
    playsinline: true,
    lang: 'zh-cn',
    autoplay: false,
    volume: 0.6,
    keyShortcut: false,
    enableContextmenu: false,
    controls: props.controls,
    // 无控制条模式：关闭内置起播/封面/点击接管，避免与业务自绘 UI 冲突
    closeVideoClick: !props.controls,
    closeVideoDblclick: !props.controls,
    ignores: props.controls ? [] : ['start', 'poster', 'error', 'replay'],
  }
}

function attach(v: HTMLVideoElement) {
  videoEl = v
  v.muted = props.muted
  bindVideo(v)
  emit('ready', v)
  if (v.readyState >= 1) onMeta()
}

onMounted(() => {
  if (!host.value) return
  player = new Player(buildOptions())
  attach(player.video as HTMLVideoElement)
})

// 切换视频源：优先复用实例（switchURL），底层 <video> 若被替换则重新绑定并上报
watch(
  () => props.src,
  (src) => {
    if (!player) return
    player.switchURL(src)
    const v = player.video as HTMLVideoElement
    if (v && v !== videoEl) {
      if (videoEl) unbindVideo(videoEl)
      attach(v)
    }
  },
)

watch(
  () => props.muted,
  (m) => {
    if (videoEl) videoEl.muted = m
  },
)

onBeforeUnmount(() => {
  if (videoEl) unbindVideo(videoEl)
  player?.destroy()
  player = null
  videoEl = null
})
</script>

<template>
  <div ref="host" class="xgp-host" />
</template>

<style scoped>
.xgp-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* 让 xgplayer 根节点与画面完全铺满容器，保持与热区层对齐 */
.xgp-host :deep(.xgplayer) {
  width: 100%;
  height: 100%;
  background: transparent;
}
.xgp-host :deep(.xgplayer-video),
.xgp-host :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: fill;
}
</style>
