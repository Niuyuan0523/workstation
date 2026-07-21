import type { Plugin } from 'vite'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * 开发期插件：为「配置页」提供保存能力。
 * 监听 POST /__api/save-course，把请求体（一份 Course JSON）写入
 * src/config/courses/<id>.json，供 import.meta.glob 自动加载。
 *
 * 仅在 dev（configureServer）生效，不影响生产构建。
 */
const ID_RE = /^[a-zA-Z0-9_-]+$/

export function courseSaver(): Plugin {
  return {
    name: 'course-saver',
    configureServer(server) {
      server.middlewares.use('/__api/save-course', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const course = JSON.parse(body)
            const id = String(course?.id ?? '')
            if (!ID_RE.test(id)) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'id 非法：仅允许字母、数字、下划线、连字符',
                }),
              )
              return
            }
            if (!course.title || !course.category || !course.videoSrc) {
              res.statusCode = 400
              res.end(
                JSON.stringify({ ok: false, error: '缺少 title / category / videoSrc' }),
              )
              return
            }
            const dir = path.resolve(process.cwd(), 'src/config/courses')
            await fs.mkdir(dir, { recursive: true })
            const file = path.join(dir, `${id}.json`)
            await fs.writeFile(file, JSON.stringify(course, null, 2) + '\n', 'utf-8')
            res.end(
              JSON.stringify({ ok: true, file: `src/config/courses/${id}.json` }),
            )
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}
