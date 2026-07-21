<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { categories } from '../config'
import type { Course } from '../types/quiz'

/**
 * 首页：按分类分组展示视频列表，分类可展开/收起。
 * 点击视频卡片进入播放页；卡片上的「配置」进入配置页。
 */
const router = useRouter()

// 默认全部展开
const expanded = ref<Set<string>>(new Set(categories.map((c) => c.name)))
function toggle(name: string) {
  const next = new Set(expanded.value)
  next.has(name) ? next.delete(name) : next.add(name)
  expanded.value = next
}

function play(c: Course) {
  router.push({ name: 'play', params: { courseId: c.id } })
}
function config(c: Course) {
  router.push({ name: 'edit', params: { courseId: c.id } })
}
function createNew() {
  router.push({ name: 'edit' })
}

// 分类配色（用于封面渐变），无匹配时用默认
const palette: Record<string, string> = {
  昆虫: 'linear-gradient(135deg,#22c55e,#15803d)',
  天文: 'linear-gradient(135deg,#6366f1,#1e3a8a)',
  物理: 'linear-gradient(135deg,#f59e0b,#b45309)',
}
const coverBg = (c: Course) =>
  c.cover ? undefined : palette[c.category] ?? 'linear-gradient(135deg,#64748b,#334155)'
</script>

<template>
  <div class="home">
    <header class="home__head">
      <div class="brand">
        <span class="brand__logo">▶</span>
        <span class="brand__name">视频闯关答题</span>
      </div>
      <button class="new-btn" @click="createNew">＋ 新建配置</button>
    </header>

    <section v-for="cat in categories" :key="cat.name" class="category">
      <button class="category__head" @click="toggle(cat.name)">
        <span class="category__arrow" :class="{ open: expanded.has(cat.name) }">▸</span>
        <span class="category__name">{{ cat.name }}</span>
        <span class="category__count">{{ cat.courses.length }} 个视频</span>
      </button>

      <transition name="collapse">
        <ul v-show="expanded.has(cat.name)" class="grid">
          <li v-for="c in cat.courses" :key="c.id" class="card" @click="play(c)">
            <div class="card__cover" :style="{ background: coverBg(c) }">
              <img v-if="c.cover" :src="c.cover" :alt="c.title" />
              <span class="card__play">▶</span>
            </div>
            <div class="card__body">
              <div class="card__title" :title="c.title">{{ c.title }}</div>
              <div class="card__meta">
                <span class="card__q">{{ c.questions.length }} 道试题</span>
                <button class="card__cfg" @click.stop="config(c)">配置</button>
              </div>
            </div>
          </li>
        </ul>
      </transition>
    </section>

    <p v-if="categories.length === 0" class="empty">
      尚未配置任何课程，点击右上角「新建配置」创建。
    </p>
  </div>
</template>

<style scoped>
.home {
  width: min(1160px, 96vw);
}
.home__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand__logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.brand__name {
  font-weight: 800;
  font-size: 20px;
  color: var(--ink);
}
.new-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.new-btn:hover {
  border-color: var(--brand);
  color: var(--brand-dark);
}

.category {
  margin-bottom: 18px;
}
.category__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  padding: 10px 4px;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
}
.category__arrow {
  transition: transform 0.18s ease;
  color: #94a3b8;
  font-size: 14px;
}
.category__arrow.open {
  transform: rotate(90deg);
}
.category__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}
.category__count {
  margin-left: auto;
  color: #94a3b8;
  font-size: 13px;
}

.grid {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}
.card {
  background: var(--card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
}
.card__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card__cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card__play {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--brand-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}
.card__body {
  padding: 12px 14px 14px;
}
.card__title {
  font-weight: 700;
  color: var(--ink);
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.card__q {
  color: #64748b;
  font-size: 12px;
}
.card__cfg {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.card__cfg:hover {
  border-color: var(--brand);
  color: var(--brand-dark);
}

.empty {
  padding: 60px 0;
  color: #64748b;
  text-align: center;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.18s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
}
</style>
