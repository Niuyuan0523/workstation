import type { Course } from '../types/quiz'

/**
 * 课程注册表
 * ---------------------------------------------------------------------------
 * 每个视频对应一个 JSON 配置文件（src/config/courses/<id>.json），一一对应。
 * 这里用 import.meta.glob 自动发现并加载全部课程，新增/保存配置文件后自动生效
 * （开发时保存会触发热更新）。配置页的「保存」会写入对应的 JSON 文件。
 */
const modules = import.meta.glob<Course>('./courses/*.json', {
  eager: true,
  import: 'default',
})

/** 全部课程（按 id 排序，保证顺序稳定） */
export const courses: Course[] = Object.values(modules)
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))

/** 按 id 取课程；找不到返回 undefined */
export function getCourse(id?: string | null): Course | undefined {
  if (!id) return undefined
  return courses.find((c) => c.id === id)
}

export interface CategoryGroup {
  name: string
  courses: Course[]
}

/** 按分类分组（保留首次出现顺序），供首页分类展开使用 */
export const categories: CategoryGroup[] = (() => {
  const map = new Map<string, Course[]>()
  for (const c of courses) {
    if (!map.has(c.category)) map.set(c.category, [])
    map.get(c.category)!.push(c)
  }
  return Array.from(map, ([name, list]) => ({ name, courses: list }))
})()

/** 已使用到的视频地址（供配置页做 datalist 提示） */
export const knownVideoSrcs: string[] = Array.from(
  new Set(courses.map((c) => c.videoSrc)),
)
