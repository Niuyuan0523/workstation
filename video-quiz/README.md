# 视频闯关答题（Vue 3 + TS + Vite）

在视频播放到指定时间点时自动暂停，在视频画面上层叠加**透明作答热区**；
学员点击热区即为作答，答对续播、答错提示重答。题目本身就是「暂停帧的画面内容」，
本项目只负责在选项位置盖一层透明的可点击区域。

**播放页与编辑页完全分开**，并支持**多套配置（一个视频一份配置文件）**，
后续新增视频只需新增一份配置并登记即可。

## 功能

- 播放项目内视频资源（示例：`public/videos/insect.mp4`，即《什么是昆虫》）
- 播放到 `pauseTime` 自动暂停并弹出该题
- 视频上层透明热区作答（当前实现**选择题**，题型可扩展）
- 答对 → 继续播放；答错 → 提示并停留重答（可按题配置为答错也放行）
- **播放页 `/play/:courseId`** 与 **编辑页 `/edit/:courseId`** 分离，顶部可一键互跳
- **多课程注册表**：一个视频一份配置文件，切换课程即加载不同试题
- 编辑页可视化配置：拖拽框选/移动/缩放热区、增删题目、改暂停时间，导出 JSON 回填

## 运行

```bash
npm install
npm run dev      # 默认 http://localhost:5178
npm run build    # 类型检查 + 打包
```

首次进入点击中间的播放按钮开始（规避浏览器自动播放限制）。

## 目录

```
src/
├─ types/quiz.ts            题目/热区/课程 的类型定义（可辨识联合，便于扩展题型）
├─ config/
│  ├─ index.ts              课程注册表：登记所有课程 + getCourse(id)
│  └─ courses/
│     └─ insect.ts          单个视频的试题配置（一个视频一份）
├─ router/index.ts          路由：/play/:courseId 与 /edit/:courseId
├─ composables/
│  └─ useVideoQuiz.ts       播放核心状态机：到点暂停、判分、续播/重答
├─ pages/
│  ├─ PlayPage.vue          播放页（作答）
│  └─ EditPage.vue          编辑页（配置热区/题目、导出 JSON）
└─ components/
   ├─ VideoQuizPlayer.vue   播放舞台：视频 + 进度/音量 + 透明热区
   ├─ QuestionOverlay.vue   作答透明热区层 + 反馈浮层
   ├─ RegionEditor.vue      热区可视化编辑器
   └─ PageToolbar.vue       顶部工具条：课程选择 + 播放/编辑切换
```

## 页面

- 播放页：`#/play/insect`
- 编辑页：`#/edit/insect`

顶部工具条可切换课程（视频）与在「播放 / 编辑」之间跳转，二者共享同一 courseId。

## 配置一道题

编辑 `src/config/courses/insect.ts`（或新建自己的课程文件）：

```ts
export const insectCourse: Course = {
  id: 'insect',
  title: '什么是昆虫',
  videoSrc: '/videos/insect.mp4',
  questions: [
    {
      id: 'q1',
      type: 'choice',
      pauseTime: 8,              // 第 8 秒暂停
      title: '……',
      resumeMode: 'onCorrect',   // 答对才续播；'always' 表示答错也续播
      regions: [                 // 坐标为占视频显示区域的百分比 0-100
        { id: 'a', label: '100万', x: 14, y: 73, width: 21, height: 20, correct: true },
        { id: 'b', label: '75万',  x: 40, y: 73, width: 21, height: 20 },
        { id: 'c', label: '50万',  x: 66, y: 73, width: 21, height: 20 },
      ],
    },
  ],
}
```

坐标建议在**编辑页**拖拽生成，再点「复制」把 JSON 回填到配置文件。

## 新增一个视频（多套配置）

1. 把视频放到 `public/videos/` 下；
2. 在 `src/config/courses/` 新建配置文件（参考 `insect.ts`），设置唯一 `id`、`videoSrc`、`questions`；
3. 在 `src/config/index.ts` 的 `courses` 数组里 import 并登记；
4. 顶部课程下拉即可选择，播放页/编辑页按 `id` 自动路由到对应配置。

## 扩展新题型

1. 在 `types/quiz.ts` 新增接口（如 `FillQuestion`）并加入 `Question` 联合类型；
2. 在 `QuestionOverlay.vue` 按 `question.type` 分发对应渲染；
3. 在 `useVideoQuiz.ts` 的 `answer()` 中按题型补充判分逻辑。

## 替换视频

把视频放到 `public/videos/` 下，修改 `course.videoSrc` 为对应路径即可
（如 `/videos/your.mp4`）。示例视频已从 `D:\MyCoding\1(什么是昆虫）.mp4` 复制为
`public/videos/insect.mp4`。
