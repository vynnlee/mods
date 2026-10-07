// The pure part of prompt-drafts: the save marker, titles and previews, the list, and every message in two languages.
import type { Draft } from '../types'

export const MAX = 50
// A prompt that ends with this is saved as a draft instead of sent.
export const MARKER = ';;'
// A session's drafts are dropped after this long without a new one.
export const KEEP_MS = 30 * 24 * 3600 * 1000
export type Lang = 'en' | 'ko'

// The text before the marker when the prompt ends with it, else null.
export function marked(text: string) {
  const t = text.trimEnd()
  if (!t.endsWith(MARKER)) return null
  return t.slice(0, -MARKER.length).trimEnd()
}

const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export function title(text: string) {
  return cut(lines(text)[0] ?? '', 48)
}

// Up to two more lines under the title, the second ending in … when the draft goes on.
export function preview(text: string, width = 60) {
  const rest = lines(text).slice(1)
  const shown = rest.slice(0, 2).map(l => cut(l, width))
  if (rest.length > 2 && shown.length) shown[shown.length - 1] = `${shown[shown.length - 1]!.replace(/…$/, '')}…`
  return shown
}

// Newest first; saving the same text again moves it to the top instead of keeping two.
export function add(list: readonly Draft[], d: Draft) {
  return [d, ...list.filter(x => x.text !== d.text)].slice(0, MAX)
}

// Put a deleted draft back where it was.
export function restore(list: readonly Draft[], d: Draft, index: number) {
  const out = list.filter(x => x.id !== d.id)
  out.splice(Math.min(index, out.length), 0, d)
  return out.slice(0, MAX)
}

export function ago(now: number, at: number, lang: Lang) {
  const m = Math.max(0, Math.round((now - at) / 60000))
  const [h, d] = [Math.floor(m / 60), Math.floor(m / 1440)]
  if (lang === 'ko') return m < 1 ? '방금' : m < 60 ? `${m}분 전` : h < 24 ? `${h}시간 전` : `${d}일 전`
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : h < 24 ? `${h}h ago` : `${d}d ago`
}

export const text = {
  en: {
    saved: (n: number, t: string) => `✓ Saved as a draft (${n} in this session): ${t}`,
    empty: 'Nothing to save: the prompt is empty.',
    failed: 'The draft could not be saved, so the prompt was not sent either.',
    loaded: (t: string) => `In the prompt box: ${t}`,
    noBox: 'There is no prompt box here to put the draft in.',
    stashed: 'What was in the prompt box was saved as a draft first.',
    removed: (t: string) => `Deleted: ${t}. /drafts undo brings it back.`,
    restored: (t: string) => `Back: ${t}`,
    noUndo: 'Nothing to bring back.',
    missing: (n: string) => `There is no draft ${n}.`,
    none: `No drafts in this session. End a prompt with ${MARKER} and press Enter to keep it aside.`,
    usage: 'Usage: /drafts, /drafts <n>, /drafts rm <n>, /drafts undo',
    draftUsage: `Usage: /draft <text>. Or end the prompt you are writing with ${MARKER} and press Enter.`,
    picker: 'Drafts',
    pickHint: 'press a number to use one, 0 to close',
    keysHint: 'number keys',
    paneHint: 'Click a draft or press its number to put it in the prompt box.',
    saveButton: 'Save prompt box',
    undoButton: 'Undo',
    deletedLine: (t: string) => `Deleted: ${t}`,
    close: 'close',
    ask: 'Which draft?',
    closed: 'Closed.',
    more: (n: number) => `Next ${n} ▸`,
    openedWide: 'Pick a draft in the sidebar, or press its number. 0 closes.',
    openedNarrow: 'Press a number to put a draft in the prompt box. 0 closes.',
    meta: (a: string, n: number) => `${a}, ${n} chars`,
    cmdDraft: `Save a prompt as a draft of this session: /draft <text>, or end any prompt with ${MARKER}`,
    cmdDrafts: "This session's drafts: pick one, /drafts <n>, /drafts rm <n>, /drafts undo",
  },
  ko: {
    saved: (n: number, t: string) => `✓ 임시저장했습니다 (이 세션 ${n}개): ${t}`,
    empty: '입력창이 비어 있어 저장하지 않았습니다.',
    failed: '임시저장에 실패해서 보내지도 않았습니다.',
    loaded: (t: string) => `입력창에 꺼냈습니다: ${t}`,
    noBox: '여기에는 꺼낸 프롬프트를 넣을 입력창이 없습니다.',
    stashed: '입력창에 있던 내용은 먼저 임시저장했습니다.',
    removed: (t: string) => `지웠습니다: ${t}. 되돌리려면 /drafts undo`,
    restored: (t: string) => `되돌렸습니다: ${t}`,
    noUndo: '되돌릴 것이 없습니다.',
    missing: (n: string) => `${n}번 임시저장이 없습니다.`,
    none: `이 세션에 임시저장한 프롬프트가 없습니다. 프롬프트 끝에 ${MARKER} 를 붙이고 Enter 하면 저장됩니다.`,
    usage: '사용법: /drafts, /drafts <번호>, /drafts rm <번호>, /drafts undo',
    draftUsage: `사용법: /draft <내용>. 또는 쓰던 프롬프트 끝에 ${MARKER} 를 붙이고 Enter.`,
    picker: '임시저장',
    pickHint: '번호를 누르면 꺼내고, 0은 닫기',
    keysHint: '번호 키',
    paneHint: '클릭하거나 번호를 누르면 입력창에 꺼냅니다.',
    saveButton: '입력창 저장',
    undoButton: '되돌리기',
    deletedLine: (t: string) => `지웠습니다: ${t}`,
    close: '닫기',
    ask: '어떤 임시저장을 꺼낼까요?',
    closed: '닫았습니다.',
    more: (n: number) => `다음 ${n}개 ▸`,
    openedWide: '사이드바에서 고르거나, 번호를 눌러 바로 꺼내세요. 0은 닫기.',
    openedNarrow: '번호를 누르면 입력창에 꺼냅니다. 0은 닫기.',
    meta: (a: string, n: number) => `${a}, ${n}자`,
    cmdDraft: `이 세션에 프롬프트 임시저장: /draft <내용>, 또는 프롬프트 끝에 ${MARKER}`,
    cmdDrafts: '이 세션의 임시저장: 골라서 꺼내기, /drafts <번호>, /drafts rm <번호>, /drafts undo',
  },
} satisfies Record<Lang, Record<string, unknown>>

// One page of the native question dialog (2-4 options): up to 4 drafts, or 3 and a "next" option.
// Labels must differ, so a repeated title gets its number.
export function askPage(list: readonly Draft[], start: number) {
  const rest = list.slice(start)
  const page = rest.length <= 4 ? rest : rest.slice(0, 3)
  const seen = new Set<string>()
  const labels = page.map((d, i) => {
    const label = seen.has(d.title) || !d.title ? `${start + i + 1}. ${d.title}` : d.title
    seen.add(label)
    return label
  })
  return { page, labels, hasMore: rest.length > page.length, next: start + page.length }
}

export function listText(list: readonly Draft[], now: number, lang: Lang) {
  const t = text[lang]
  if (!list.length) return t.none
  return list.map((d, i) => `${String(i + 1).padStart(2)}  ${d.title}  (${t.meta(ago(now, d.savedAt, lang), d.text.length)})`).join('\n')
}
