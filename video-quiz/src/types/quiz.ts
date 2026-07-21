/**
 * 试题数据模型
 * ---------------------------------------------------------------------------
 * 设计目标：当前仅实现「选择题（choice）」，但通过 `type` 字段做可辨识联合
 * （discriminated union），后续可平滑扩展「填空 / 拖拽 / 判断」等题型，
 * 只需新增对应的接口并加入 `Question` 联合类型即可，渲染层按 type 分发。
 */

/** 已支持 / 预留的题型标识 */
export type QuestionType = 'choice' // 预留: | 'fill' | 'judge' | 'drag'

/**
 * 作答热区：视频上层的一块「透明可点击区域」。
 * 坐标全部使用相对视频显示区域的百分比（0-100），因此在任意分辨率 / 缩放下
 * 都能自适应地贴合视频画面中的选项位置。
 */
export interface AnswerRegion {
  id: string
  /** 便于配置时辨识，运行时默认不显示（编辑模式下可见） */
  label?: string
  /** 左上角 X，占视频显示宽度的百分比 0-100 */
  x: number
  /** 左上角 Y，占视频显示高度的百分比 0-100 */
  y: number
  /** 宽度百分比 0-100 */
  width: number
  /** 高度百分比 0-100 */
  height: number
  /** 是否为正确答案（可多选正确） */
  correct?: boolean
}

/** 所有题型共享的基础字段 */
export interface BaseQuestion {
  id: string
  type: QuestionType
  /** 播放到该时间点（秒）时暂停并弹出本题 */
  pauseTime: number
  /** 题干（可选，用于无障碍 / 编辑模式提示；画面里的题目本身来自视频帧） */
  title?: string
  /**
   * 过关方式：
   * - 'onCorrect'（默认）：答对才继续播放，答错停留并提示重答
   * - 'always'：无论对错都会继续播放（答错仅提示）
   */
  resumeMode?: 'onCorrect' | 'always'
}

/** 选择题：点击某个热区即为选择该项 */
export interface ChoiceQuestion extends BaseQuestion {
  type: 'choice'
  regions: AnswerRegion[]
}

/** 题目联合类型：后续扩展新题型时在此追加 */
export type Question = ChoiceQuestion

/** 一节课程 = 一个视频 + 一组按时间排布的试题（视频与试题一一对应） */
export interface Course {
  /** 课程唯一标识，同时作为配置文件名 src/config/courses/<id>.json */
  id: string
  title: string
  /** 分类名，如「昆虫 / 天文 / 物理」，首页按分类分组展示 */
  category: string
  /** 可选封面图地址 */
  cover?: string
  /** 视频地址：放在 public/videos/ 下，通过根路径引用 */
  videoSrc: string
  questions: Question[]
}

/** 单题作答结果 */
export interface AnswerResult {
  questionId: string
  regionId: string
  correct: boolean
}
