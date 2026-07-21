import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  type Ref,
} from 'vue'
import type { Course, Question, AnswerRegion, AnswerResult } from '../types/quiz'

/**
 * 视频闯关答题的核心状态机。
 * 负责：跟踪播放进度、到点暂停弹题、判分、答对续播 / 答错提示重答。
 *
 * @param course   课程数据（建议传入 reactive 副本，便于编辑器实时改热区）
 * @param videoRef <video> 元素的模板引用
 */
export function useVideoQuiz(course: Course, videoRef: Ref<HTMLVideoElement | null>) {
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)
  /** 当前弹出的题目；为 null 表示正常播放 */
  const activeQuestion = ref<Question | null>(null)
  /** 已答对（或已放行）的题目 id 集合，避免重复弹出 */
  const answeredIds = ref<Set<string>>(new Set())
  /** 反馈态：正确 / 错误 / 无 */
  const feedback = ref<'correct' | 'wrong' | null>(null)
  /** 最近一次点击选中的热区 id，用于渲染反馈样式 */
  const selectedRegionId = ref<string | null>(null)

  /** 题目按暂停时间升序 */
  const questions = computed(() =>
    [...course.questions].sort((a, b) => a.pauseTime - b.pauseTime),
  )
  /** 播放进度百分比（顶部进度条） */
  const progress = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0,
  )
  const answeredCount = computed(() => answeredIds.value.size)
  const totalCount = computed(() => questions.value.length)
  const ended = ref(false)

  let feedbackTimer: number | undefined
  let resumeTimer: number | undefined

  function scheduleFeedbackClear(ms: number) {
    if (feedbackTimer) window.clearTimeout(feedbackTimer)
    feedbackTimer = window.setTimeout(() => (feedback.value = null), ms)
  }

  /** 找到「已经到点且尚未作答」的题目 */
  function findDueQuestion(): Question | null {
    for (const q of questions.value) {
      if (answeredIds.value.has(q.id)) continue
      if (currentTime.value >= q.pauseTime) return q
    }
    return null
  }

  function onTimeUpdate() {
    const v = videoRef.value
    if (!v) return
    currentTime.value = v.currentTime
    if (activeQuestion.value) return
    const due = findDueQuestion()
    if (due) {
      v.pause()
      // 对齐到题目时间点，让画面精确停在设计的暂停帧
      if (Math.abs(v.currentTime - due.pauseTime) > 0.05) {
        v.currentTime = due.pauseTime
        currentTime.value = due.pauseTime
      }
      activeQuestion.value = due
      feedback.value = null
      selectedRegionId.value = null
    }
  }

  function onLoadedMetadata() {
    const v = videoRef.value
    if (v) duration.value = v.duration
  }
  function onPlay() {
    isPlaying.value = true
    ended.value = false
  }
  function onPause() {
    isPlaying.value = false
  }
  function onEnded() {
    ended.value = true
    isPlaying.value = false
  }

  function play() {
    videoRef.value?.play().catch(() => {})
  }
  function pause() {
    videoRef.value?.pause()
  }
  function togglePlay() {
    if (activeQuestion.value) return // 答题中不允许手动续播
    isPlaying.value ? pause() : play()
  }

  function markAnswered(id: string) {
    const next = new Set(answeredIds.value)
    next.add(id)
    answeredIds.value = next
  }

  /**
   * 作答：点击某个热区。
   * - 答对：短暂提示后清除题目并续播。
   * - 答错：提示重答；若题目 resumeMode==='always' 则也会放行续播。
   */
  function answer(region: AnswerRegion): AnswerResult | null {
    const q = activeQuestion.value
    if (!q) return null
    selectedRegionId.value = region.id
    const correct = !!region.correct
    const result: AnswerResult = { questionId: q.id, regionId: region.id, correct }

    if (resumeTimer) window.clearTimeout(resumeTimer)

    if (correct) {
      feedback.value = 'correct'
      markAnswered(q.id)
      resumeTimer = window.setTimeout(() => {
        activeQuestion.value = null
        selectedRegionId.value = null
        play()
      }, 650)
      scheduleFeedbackClear(900)
    } else {
      feedback.value = 'wrong'
      if (q.resumeMode === 'always') {
        markAnswered(q.id)
        resumeTimer = window.setTimeout(() => {
          activeQuestion.value = null
          selectedRegionId.value = null
          play()
        }, 850)
      }
      scheduleFeedbackClear(1200)
    }
    return result
  }

  /** 重新开始整节课程 */
  function reset() {
    const v = videoRef.value
    answeredIds.value = new Set()
    activeQuestion.value = null
    feedback.value = null
    selectedRegionId.value = null
    ended.value = false
    if (v) {
      v.currentTime = 0
      currentTime.value = 0
      play()
    }
  }

  /** 编辑器用：跳到某题的暂停时间并暂停，方便对齐热区 */
  function seekTo(time: number) {
    const v = videoRef.value
    if (!v) return
    v.pause()
    v.currentTime = time
    currentTime.value = time
  }

  function bind(v: HTMLVideoElement) {
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
  }
  function unbind(v: HTMLVideoElement) {
    v.removeEventListener('timeupdate', onTimeUpdate)
    v.removeEventListener('loadedmetadata', onLoadedMetadata)
    v.removeEventListener('play', onPlay)
    v.removeEventListener('pause', onPause)
    v.removeEventListener('ended', onEnded)
  }

  const stopWatch = watch(videoRef, (v, old) => {
    if (old) unbind(old)
    if (v) {
      bind(v)
      if (v.readyState >= 1) duration.value = v.duration
    }
  })

  onBeforeUnmount(() => {
    stopWatch()
    if (videoRef.value) unbind(videoRef.value)
    if (feedbackTimer) window.clearTimeout(feedbackTimer)
    if (resumeTimer) window.clearTimeout(resumeTimer)
  })

  return {
    // state
    currentTime,
    duration,
    isPlaying,
    activeQuestion,
    answeredIds,
    feedback,
    selectedRegionId,
    ended,
    // derived
    questions,
    progress,
    answeredCount,
    totalCount,
    // actions
    play,
    pause,
    togglePlay,
    answer,
    reset,
    seekTo,
  }
}
