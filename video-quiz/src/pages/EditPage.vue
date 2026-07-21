<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCourse, courses, categories, knownVideoSrcs } from '../config'
import type { Course, ChoiceQuestion } from '../types/quiz'
import RegionEditor from '../components/RegionEditor.vue'

/**
 * 配置页：编辑某个视频的试题（热区/题目/暂停时间），并「保存」到配置文件。
 * - 保存通过开发期插件写入 src/config/courses/<id>.json
 * - 与播放页分开；这里不做自动暂停，可自由拖动进度、跳到某题暂停帧对齐热区
 * - 省略路由 id 表示新建课程
 */
const route = useRoute()
const router = useRouter()
const routeId = computed(() => route.params.courseId as string | undefined)

const data = ref<Course | null>(null)
const editingId = ref<string>('')

// 保存状态（在 loadWorkingCopy 中会重置 saveMsg，需先声明以避免 TDZ）
const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(false)

function blankCourse(): Course {
  return {
    id: '',
    title: '',
    category: '',
    videoSrc: '/videos/insect.mp4',
    questions: [],
  }
}

function loadWorkingCopy() {
  const s = getCourse(routeId.value)
  data.value = s ? structuredClone(s) : blankCourse()
  editingId.value = data.value.questions[0]?.id ?? ''
  saveMsg.value = ''
  nextTick(() => seekToEditing())
}
watch(routeId, loadWorkingCopy, { immediate: true })

const isNew = computed(() => !getCourse(routeId.value))

const editingQuestion = computed<ChoiceQuestion | null>(() => {
  const q = data.value?.questions.find((it) => it.id === editingId.value)
  return q && q.type === 'choice' ? q : null
})

/* ------------------------- 视频控制（无自动暂停） ------------------------- */
const videoRef = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const muted = ref(false)
const videoAspect = ref('16 / 9')

function toggleMute() {
  muted.value = !muted.value
  if (videoRef.value) videoRef.value.muted = muted.value
}

function onMeta(e: Event) {
  const v = e.target as HTMLVideoElement
  duration.value = v.duration
  if (v.videoWidth && v.videoHeight) videoAspect.value = `${v.videoWidth} / ${v.videoHeight}`
}
function onTime() {
  currentTime.value = videoRef.value?.currentTime ?? 0
}
function togglePlay() {
  const v = videoRef.value
  if (!v) return
  v.paused ? v.play().catch(() => {}) : v.pause()
}
function seek(t: number) {
  const v = videoRef.value
  if (!v) return
  v.currentTime = t
  currentTime.value = t
}
function seekToEditing() {
  const v = videoRef.value
  if (v && editingQuestion.value) {
    v.pause()
    seek(editingQuestion.value.pauseTime)
  }
}
watch(editingId, () => {
  selectedRegionId.value = null
  seekToEditing()
})

/* ------------------------------- 题目管理 ------------------------------- */
function nextQuestionId(): string {
  const ids = new Set(data.value?.questions.map((q) => q.id))
  let i = (data.value?.questions.length ?? 0) + 1
  while (ids.has('q' + i)) i++
  return 'q' + i
}
function addQuestion() {
  if (!data.value) return
  const q: ChoiceQuestion = {
    id: nextQuestionId(),
    type: 'choice',
    pauseTime: Math.round(currentTime.value),
    title: '',
    resumeMode: 'onCorrect',
    regions: [],
  }
  data.value.questions.push(q)
  editingId.value = q.id
}
function removeQuestion(id: string) {
  if (!data.value) return
  const idx = data.value.questions.findIndex((q) => q.id === id)
  if (idx >= 0) data.value.questions.splice(idx, 1)
  editingId.value = data.value.questions[0]?.id ?? ''
}

/* ------------------------------- 热区属性 ------------------------------- */
// 选中的热区（由 RegionEditor 上报，属性面板在侧边栏渲染，不遮挡画面）
const selectedRegionId = ref<string | null>(null)
const currentRegion = computed(
  () => editingQuestion.value?.regions.find((r) => r.id === selectedRegionId.value) ?? null,
)
function removeSelectedRegion() {
  const q = editingQuestion.value
  const id = selectedRegionId.value
  if (!q || !id) return
  const idx = q.regions.findIndex((r) => r.id === id)
  if (idx >= 0) q.regions.splice(idx, 1)
  selectedRegionId.value = null
}
const regionsJson = computed(() =>
  editingQuestion.value ? JSON.stringify(editingQuestion.value.regions, null, 2) : '[]',
)
const regionsCopied = ref(false)
async function copyRegions() {
  try {
    await navigator.clipboard.writeText(regionsJson.value)
    regionsCopied.value = true
    window.setTimeout(() => (regionsCopied.value = false), 1500)
  } catch {
    /* ignore */
  }
}

/* ------------------------------- 保存 / 导出 ------------------------------- */
const json = computed(() => (data.value ? JSON.stringify(data.value, null, 2) : ''))
const copied = ref(false)
async function copyJson() {
  try {
    await navigator.clipboard.writeText(json.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* ignore */
  }
}

async function save() {
  if (!data.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    const res = await fetch('/__api/save-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.value),
    })
    const j = await res.json()
    saveOk.value = !!j.ok
    saveMsg.value = j.ok ? `已保存到 ${j.file}` : `保存失败：${j.error}`
    // 新建保存成功后，切到该课程的编辑地址
    if (j.ok && isNew.value && data.value.id) {
      router.replace({ name: 'edit', params: { courseId: data.value.id } })
    }
  } catch (e) {
    saveOk.value = false
    saveMsg.value = `保存失败（需在 npm run dev 下）：${String(e)}`
  } finally {
    saving.value = false
  }
}

function goHome() {
  router.push({ name: 'home' })
}
function switchCourse(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  if (id === '__new') router.push({ name: 'edit' })
  else router.push({ name: 'edit', params: { courseId: id } })
}

function fmt(sec: number) {
  if (!Number.isFinite(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <div class="page" v-if="data">
    <!-- 顶部工具条 -->
    <header class="toolbar">
      <div class="toolbar__left">
        <button class="back" title="返回首页" @click="goHome">‹ 首页</button>
        <span class="title">试题配置</span>
        <select class="course-select" :value="routeId ?? '__new'" @change="switchCourse">
          <option value="__new">＋ 新建课程</option>
          <option v-for="c in courses" :key="c.id" :value="c.id">
            {{ c.category }} / {{ c.title }}
          </option>
        </select>
      </div>
      <div class="toolbar__right">
        <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">
          {{ saveMsg }}
        </span>
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存配置文件' }}
        </button>
      </div>
    </header>

    <!-- 课程基本信息 -->
    <div class="course-fields">
      <label class="cf">
        课程 ID
        <input v-model="data.id" :disabled="!isNew" placeholder="字母/数字/-_，作为文件名" />
      </label>
      <label class="cf">
        标题
        <input v-model="data.title" placeholder="视频标题" />
      </label>
      <label class="cf">
        分类
        <input v-model="data.category" list="cat-list" placeholder="如 昆虫" />
        <datalist id="cat-list">
          <option v-for="g in categories" :key="g.name" :value="g.name" />
        </datalist>
      </label>
      <label class="cf cf--wide">
        视频地址
        <input v-model="data.videoSrc" list="video-list" placeholder="/videos/xxx.mp4" />
        <datalist id="video-list">
          <option v-for="src in knownVideoSrcs" :key="src" :value="src" />
        </datalist>
      </label>
    </div>

    <div class="edit-body">
      <!-- 左：视频 + 热区编辑器 -->
      <div class="edit-main">
        <div class="video-wrap" :style="{ aspectRatio: videoAspect }">
          <video
            ref="videoRef"
            class="video"
            :src="data.videoSrc"
            :muted="muted"
            playsinline
            preload="metadata"
            @loadedmetadata="onMeta"
            @timeupdate="onTime"
            @play="isPlaying = true"
            @pause="isPlaying = false"
          />
          <RegionEditor
            v-if="editingQuestion"
            :key="editingQuestion.id"
            v-model:selected="selectedRegionId"
            :question="editingQuestion"
          />
        </div>

        <div class="controls">
          <button class="ctrl-btn" @click="togglePlay">
            {{ isPlaying ? '暂停' : '播放' }}
          </button>
          <button class="ctrl-btn" :title="muted ? '取消静音' : '静音'" @click="toggleMute">
            {{ muted ? '🔇' : '🔊' }}
          </button>
          <input
            class="seekbar"
            type="range"
            min="0"
            :max="duration || 0"
            step="0.1"
            :value="currentTime"
            @input="seek(Number(($event.target as HTMLInputElement).value))"
          />
          <span class="time">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>
        </div>
      </div>

      <!-- 右：题目管理 -->
      <aside class="edit-side">
        <div class="side-head">
          <strong>题目列表</strong>
          <button class="add-btn" @click="addQuestion">+ 新增（用当前帧）</button>
        </div>

        <ul class="q-list">
          <li
            v-for="q in data.questions"
            :key="q.id"
            :class="{ active: q.id === editingId }"
            @click="editingId = q.id"
          >
            <span class="q-id">{{ q.id }}</span>
            <span class="q-time">{{ fmt(q.pauseTime) }}</span>
            <button class="q-del" title="删除" @click.stop="removeQuestion(q.id)">×</button>
          </li>
          <li v-if="data.questions.length === 0" class="q-empty">暂无题目，点右上新增</li>
        </ul>

        <div v-if="editingQuestion" class="q-meta">
          <label class="field">
            题干
            <input v-model="editingQuestion.title" placeholder="选填，画面里已有题目" />
          </label>
          <div class="field-row">
            <label class="field">
              暂停时间(秒)
              <input v-model.number="editingQuestion.pauseTime" type="number" min="0" step="0.1" />
            </label>
            <button class="jump-btn" @click="seekToEditing">跳到该帧</button>
          </div>
          <label class="field">
            过关方式
            <select v-model="editingQuestion.resumeMode">
              <option value="onCorrect">答对才续播</option>
              <option value="always">答错也续播</option>
            </select>
          </label>
          <p class="tip">在左侧视频画面空白处拖拽新建热区，拖动移动、右下角缩放。</p>

          <!-- 热区属性（从视频上移到侧边栏，避免遮挡画面） -->
          <div class="regions">
            <div class="regions__head">
              <strong>热区（{{ editingQuestion.regions.length }}）</strong>
            </div>
            <ul class="r-list">
              <li
                v-for="r in editingQuestion.regions"
                :key="r.id"
                :class="{ active: r.id === selectedRegionId }"
                @click="selectedRegionId = r.id"
              >
                <span class="r-id">{{ r.id }}<template v-if="r.correct"> ✓</template></span>
                <span class="r-label">{{ r.label || '—' }}</span>
              </li>
              <li v-if="editingQuestion.regions.length === 0" class="r-empty">
                在左侧画面拖拽新建热区
              </li>
            </ul>

            <div v-if="currentRegion" class="r-props">
              <div class="field-row">
                <span class="r-sel">选中：<b>{{ currentRegion.id }}</b></span>
                <button class="r-del" @click="removeSelectedRegion">删除</button>
              </div>
              <label class="field">
                文案
                <input v-model="currentRegion.label" placeholder="如 100万" />
              </label>
              <label class="r-check">
                <input type="checkbox" v-model="currentRegion.correct" />
                设为正确答案
              </label>
              <div class="r-coords">
                x {{ currentRegion.x }} · y {{ currentRegion.y }} · w
                {{ currentRegion.width }} · h {{ currentRegion.height }}
              </div>
            </div>
            <p v-else class="r-empty">点击上方列表或画面中的热区进行编辑。</p>

            <div class="r-json">
              <div class="field-row">
                <span>regions JSON</span>
                <button class="r-copy" @click="copyRegions">
                  {{ regionsCopied ? '已复制' : '复制' }}
                </button>
              </div>
              <textarea class="r-json__area" readonly :value="regionsJson" />
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 底部：整套课程配置 JSON -->
    <div class="json-box">
      <div class="json-head">
        <strong>配置 JSON 预览</strong>
        <span class="json-hint">「保存配置文件」写入 src/config/courses/{{ data.id || '<id>' }}.json</span>
        <button class="copy-btn" @click="copyJson">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <textarea class="json-area" readonly :value="json" />
    </div>
  </div>
</template>

<style scoped>
.page {
  width: min(1160px, 96vw);
  display: flex;
  flex-direction: column;
}

/* 顶部工具条 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.back {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
}
.title {
  font-weight: 800;
  font-size: 16px;
  color: var(--ink);
}
.course-select {
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 14px;
}
.save-msg {
  font-size: 13px;
}
.save-msg.ok {
  color: var(--brand-dark);
}
.save-msg.err {
  color: var(--danger);
}
.save-btn {
  border: none;
  background: var(--brand);
  color: #fff;
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 700;
  cursor: pointer;
}
.save-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

/* 课程字段 */
.course-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr) 2fr;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  margin-bottom: 16px;
}
.cf {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #475569;
}
.cf--wide {
  grid-column: 1 / -1;
}
.cf input {
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}
.cf input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.edit-body {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.edit-main {
  flex: 1;
  min-width: 0;
}
.video-wrap {
  position: relative;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: #0b1220;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}
.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.ctrl-btn {
  border: none;
  background: var(--brand);
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
}
.seekbar {
  flex: 1;
  accent-color: var(--brand);
}
.time {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

/* 右侧题目管理 */
.edit-side {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
  padding: 14px;
}
.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.add-btn {
  border: none;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.q-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  max-height: 180px;
  overflow: auto;
}
.q-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.q-list li:hover {
  background: #f8fafc;
}
.q-list li.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.q-empty {
  color: #94a3b8;
  font-size: 13px;
  cursor: default !important;
}
.q-id {
  font-weight: 700;
  color: var(--ink);
}
.q-time {
  color: #64748b;
  font-size: 12px;
  margin-left: auto;
}
.q-del {
  border: none;
  background: transparent;
  color: #ef4444;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.q-meta {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #475569;
}
.field input,
.field select {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}
.field-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.field-row .field {
  flex: 1;
}
.jump-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  white-space: nowrap;
}
.tip {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* 热区属性（侧边栏） */
.regions {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.regions__head {
  font-size: 13px;
  color: var(--ink);
}
.r-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
}
.r-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.r-list li.active {
  border-color: var(--brand);
  background: #f0fdf4;
}
.r-id {
  font-weight: 700;
  color: var(--ink);
}
.r-label {
  color: #64748b;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.r-empty {
  color: #94a3b8;
  font-size: 12px;
  margin: 0;
}
.r-props {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}
.r-sel {
  font-size: 13px;
  color: #475569;
}
.r-del {
  border: none;
  background: var(--danger);
  color: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  margin-left: auto;
}
.r-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}
.r-coords {
  color: #475569;
  font-size: 12px;
}
.r-json {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.r-copy {
  border: none;
  background: var(--brand);
  color: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  margin-left: auto;
}
.r-json__area {
  width: 100%;
  height: 110px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px;
  resize: vertical;
}

/* JSON 导出 */
.json-box {
  margin-top: 18px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  padding: 14px;
}
.json-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.json-hint {
  color: #94a3b8;
  font-size: 12px;
}
.copy-btn {
  margin-left: auto;
  border: none;
  background: #64748b;
  color: #fff;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
}
.json-area {
  width: 100%;
  height: 200px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  resize: vertical;
}
</style>
