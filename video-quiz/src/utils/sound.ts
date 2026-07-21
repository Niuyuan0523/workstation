/**
 * 轻量音效工具：用 Web Audio API 合成提示音，无需引入音频文件。
 * 首次调用需在用户手势内（如点击答题热区），以满足浏览器自动播放策略。
 */
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

/** 播放一段单音（内部用） */
function beep(c: AudioContext, freq: number, start: number, dur: number, gainPeak = 0.25) {
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, now + start)
  gain.gain.setValueAtTime(0.0001, now + start)
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(now + start)
  osc.stop(now + start + dur)
}

/** 答错音效：两声下行的低沉“错误”提示音 */
export function playWrongSound() {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  beep(c, 200, 0, 0.15)
  beep(c, 150, 0.16, 0.22)
}
