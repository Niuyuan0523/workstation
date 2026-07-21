<script setup lang="ts">
import { computed } from 'vue'
import type { Question, AnswerRegion } from '../types/quiz'

const props = defineProps<{
  question: Question
  feedback: 'correct' | 'wrong' | null
  selectedRegionId: string | null
  /** 是否显示热区轮廓与文字（调试用；正式作答时为透明） */
  showHints?: boolean
}>()

const emit = defineEmits<{
  (e: 'answer', region: AnswerRegion): void
}>()

/** 选择题的热区（后续扩展题型时可在此按 type 分发不同渲染） */
const regions = computed<AnswerRegion[]>(() =>
  props.question.type === 'choice' ? props.question.regions : [],
)

function regionStyle(r: AnswerRegion) {
  return {
    left: r.x + '%',
    top: r.y + '%',
    width: r.width + '%',
    height: r.height + '%',
  }
}

function stateClass(r: AnswerRegion) {
  const isSelected = props.selectedRegionId === r.id
  return {
    'region--hint': props.showHints,
    'region--selected-correct': props.feedback === 'correct' && isSelected,
    'region--selected-wrong': props.feedback === 'wrong' && isSelected,
    // 答错后，把正确项标绿，帮助学习
    'region--reveal-correct':
      props.feedback === 'wrong' && r.correct && !isSelected,
  }
}
</script>

<template>
  <div class="overlay" role="group" :aria-label="question.title || '试题'">
    <button
      v-for="r in regions"
      :key="r.id"
      class="region"
      :class="stateClass(r)"
      :style="regionStyle(r)"
      :aria-label="r.label || r.id"
      @click="emit('answer', r)"
    >
      <span v-if="showHints" class="region__label">{{ r.label || r.id }}</span>
    </button>

    <transition name="pop">
      <div v-if="feedback === 'correct'" class="toast toast--correct">
        <span class="toast__icon">✓</span> 回答正确
      </div>
    </transition>
    <transition name="pop">
      <div v-if="feedback === 'wrong'" class="toast toast--wrong">
        <span class="toast__icon">✕</span> 答错了，再想想～
      </div>
    </transition>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
}

/* 透明作答热区：默认完全透明，只有指针提示 */
.region {
  position: absolute;
  margin: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.region:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(34, 197, 94, 0.6);
}
.region:focus-visible {
  outline: none;
  border-color: var(--brand);
}

/* 调试/编辑提示态：可见轮廓 */
.region--hint {
  border-color: rgba(59, 130, 246, 0.7);
  background: rgba(59, 130, 246, 0.12);
}
.region__label {
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  border-radius: 999px;
}

/* 反馈态 */
.region--selected-correct {
  border-color: var(--brand);
  background: rgba(34, 197, 94, 0.22);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.25);
}
.region--selected-wrong {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.22);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
  animation: shake 0.35s ease;
}
.region--reveal-correct {
  border-color: var(--brand);
  background: rgba(34, 197, 94, 0.14);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  75% {
    transform: translateX(6px);
  }
}

/* 反馈浮层 */
.toast {
  position: absolute;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 6;
}
.toast--correct {
  background: var(--brand);
}
.toast--wrong {
  background: var(--danger);
}
.toast__icon {
  font-weight: 900;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
