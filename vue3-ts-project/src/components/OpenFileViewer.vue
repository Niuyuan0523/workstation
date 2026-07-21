<script setup lang="ts" name="OpenFileViewer">
import { ref, watch } from 'vue'
import { OpenFileViewer } from '@open-file-viewer/vue'
import { imagePlugin, officePlugin, textPlugin } from '@open-file-viewer/core'
import '@open-file-viewer/core/style.css'

const props = defineProps<{ file: string }>()

const fileObj = ref<File | null>(null)
const fileName = ref('')

// 监听 file URL 变化，将其转换为 File 对象
watch(
  () => props.file,
  async (url) => {
    if (!url) return
    
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const name = url.split('/').pop() || 'file'
      fileObj.value = new File([blob], name, { type: blob.type })
      fileName.value = name
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  },
  { immediate: true }
)

const plugins = [
  imagePlugin(),
  textPlugin(),
  officePlugin()
]
</script>

<template>
  <OpenFileViewer
    v-if="fileObj"
    :file="fileObj"
    :file-name="fileName"
    width="100%"
    height="640px"
    fit="contain"
    toolbar
    theme="auto"
    :plugins="plugins"
  />
  <div v-else class="flex items-center justify-center h-[640px] text-gray-500">
    加载中...
  </div>
</template>