import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由
 * - /                首页：分类视频列表
 * - /play/:courseId  播放页：只播放 + 返回（视频与试题一一对应）
 * - /edit/:courseId? 配置页：编辑试题并保存配置文件（省略 id 表示新建）
 * 使用 hash 模式，静态部署 / 预览刷新都不会 404。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    {
      path: '/play/:courseId',
      name: 'play',
      component: () => import('../pages/PlayPage.vue'),
    },
    {
      path: '/edit/:courseId?',
      name: 'edit',
      component: () => import('../pages/EditPage.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
