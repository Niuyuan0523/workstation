<script setup lang="ts">
// Header 组件，提供顶部导航功能

interface Props {
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: 'auto'
})
</script>

<template>
  <header 
    class="w-full py-6 px-4 md:px-8 glass-effect sticky top-0 z-50 border-b border-slate-700/50"
    :style="{ height: props.height !== 'auto' ? props.height : undefined }"
  >
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <div class="flex items-center gap-3">
        <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.546 10.93L13.067.457c-.604-.607-1.582-.607-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.887.438.511.511.655 1.248.436 1.892l2.758 2.76c.537-.54 1.411-.54 1.951 0 .539.538.539 1.41 0 1.949l-3.002 3.003c-.759.759-2.047.761-2.804.002l-2.76-2.76-1.65 1.65c-.605.606-.605 1.584 0 2.19l10.48 10.473c.605.606 1.584.606 2.189 0l2.174-2.174c.605-.604.605-1.583 0-2.19z"/>
        </svg>
        <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Git Ultra
        </h1>
      </div>
      <a href="../index.html" class="text-sm text-slate-400 hover:text-white transition-colors">
        <svg class="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
        </svg>
        返回首页
      </a>
    </div>
  </header>
</template>

<style scoped>
.glass-effect {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
