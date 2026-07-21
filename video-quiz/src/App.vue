<script setup lang="ts">
// 根组件：仅承载路由视图，播放页 / 编辑页各自独立
</script>

<template>
  <main class="app">
    <router-view />
  </main>
</template>

<style scoped>
.app {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
