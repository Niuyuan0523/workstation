import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { courseSaver } from './vite-plugins/course-saver'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), courseSaver()],
  server: {
    host: true, // 监听所有网卡，允许局域网用 IPv4 地址访问
    port: 5178,
    open: true,
  },
})
