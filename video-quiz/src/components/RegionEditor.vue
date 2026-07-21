<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { ChoiceQuestion, AnswerRegion } from '../types/quiz'

/**
 * 热区编辑器（仅视频上层的可视化层）：在视频上「框选 / 移动 / 缩放」作答热区，
 * 直接修改传入题目的 regions（reactive）。选中项通过 v-model:selected 上报，
 * 属性面板 / JSON 由父级（侧边栏）渲染，避免面板遮挡画面热区。
 * 仅对选择题（choice）生效。
 */
const props = defineProps<{
  question: ChoiceQuestion
}>()

// 选中的热区 id，与父级双向绑定
const selectedId = defineModel<string | null>('selected', { default: null })
const root = ref<HTMLElement | null>(null)

type Mode = 'idle' | 'create' | 'move' | 'resize'
const mode = ref<Mode>('idle')

// 拖拽过程中的临时状态
let startPctX = 0
let startPctY = 0
let originX = 0
let originY = 0
let originW = 0
let originH = 0
const draft = ref<AnswerRegion | null>(null)

const round = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function toPct(clientX: number, clientY: number) {
  const rect = root.value!.getBoundingClientRect()
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
  }
}

function nextId(): string {
  const base = 'opt'
  let i = props.question.regions.length + 1
  const ids = new Set(props.question.regions.map((r) => r.id))
  while (ids.has(base + i)) i++
  return base + i
}

function startCreate(e: MouseEvent) {
  const p = toPct(e.clientX, e.clientY)
  startPctX = p.x
  startPctY = p.y
  draft.value = { id: '__draft__', x: p.x, y: p.y, width: 0, height: 0 }
  mode.value = 'create'
  attachDocListeners()
}

function startMove(e: MouseEvent, r: AnswerRegion) {
  e.stopPropagation()
  selectedId.value = r.id
  const p = toPct(e.clientX, e.clientY)
  startPctX = p.x
  startPctY = p.y
  originX = r.x
  originY = r.y
  mode.value = 'move'
  attachDocListeners()
}

function startResize(e: MouseEvent, r: AnswerRegion) {
  e.stopPropagation()
  selectedId.value = r.id
  const p = toPct(e.clientX, e.clientY)
  startPctX = p.x
  startPctY = p.y
  originW = r.width
  originH = r.height
  mode.value = 'resize'
  attachDocListeners()
}

function onDocMouseMove(e: MouseEvent) {
  if (mode.value === 'idle') return
  const p = toPct(e.clientX, e.clientY)
  if (mode.value === 'create' && draft.value) {
    const x = Math.min(p.x, startPctX)
    const y = Math.min(p.y, startPctY)
    draft.value = {
      id: '__draft__',
      x: round(x),
      y: round(y),
      width: round(Math.abs(p.x - startPctX)),
      height: round(Math.abs(p.y - startPctY)),
    }
  } else if (mode.value === 'move') {
    const r = current.value
    if (!r) return
    r.x = round(clamp(originX + (p.x - startPctX), 0, 100 - r.width))
    r.y = round(clamp(originY + (p.y - startPctY), 0, 100 - r.height))
  } else if (mode.value === 'resize') {
    const r = current.value
    if (!r) return
    r.width = round(clamp(originW + (p.x - startPctX), 2, 100 - r.x))
    r.height = round(clamp(originH + (p.y - startPctY), 2, 100 - r.y))
  }
}

function onDocMouseUp() {
  if (mode.value === 'create' && draft.value) {
    const d = draft.value
    if (d.width >= 2 && d.height >= 2) {
      const r: AnswerRegion = {
        id: nextId(),
        label: '',
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
      }
      props.question.regions.push(r)
      selectedId.value = r.id
    }
    draft.value = null
  }
  mode.value = 'idle'
  detachDocListeners()
}

function attachDocListeners() {
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
}
function detachDocListeners() {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
}
onBeforeUnmount(detachDocListeners)

const current = computed(() =>
  props.question.regions.find((r) => r.id === selectedId.value) || null,
)

function styleOf(r: AnswerRegion) {
  return { left: r.x + '%', top: r.y + '%', width: r.width + '%', height: r.height + '%' }
}
</script>

<template>
  <div ref="root" class="editor" @mousedown="startCreate">
    <!-- 已有热区 -->
    <div
      v-for="r in question.regions"
      :key="r.id"
      class="ed-region"
      :class="{ 'ed-region--selected': r.id === selectedId, 'ed-region--correct': r.correct }"
      :style="styleOf(r)"
      @mousedown="startMove($event, r)"
    >
      <span class="ed-region__tag">
        {{ r.id }}<template v-if="r.correct"> ✓</template>
      </span>
      <span
        class="ed-region__handle"
        @mousedown="startResize($event, r)"
      />
    </div>

    <!-- 正在框选的草稿 -->
    <div v-if="draft" class="ed-draft" :style="styleOf(draft)" />
  </div>
</template>

<style scoped>
.editor {
  position: absolute;
  inset: 0;
  z-index: 20;
  cursor: crosshair;
}

.ed-region {
  position: absolute;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 12px;
  cursor: move;
}
.ed-region--selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.18);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
}
.ed-region--correct {
  border-color: var(--brand);
  background: rgba(34, 197, 94, 0.18);
}
.ed-region__tag {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: rgba(30, 58, 95, 0.8);
  padding: 1px 6px;
  border-radius: 6px;
  pointer-events: none;
}
.ed-region__handle {
  position: absolute;
  right: -7px;
  bottom: -7px;
  width: 14px;
  height: 14px;
  background: #fff;
  border: 2px solid #f59e0b;
  border-radius: 50%;
  cursor: nwse-resize;
}

.ed-draft {
  position: absolute;
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  pointer-events: none;
}
</style>
