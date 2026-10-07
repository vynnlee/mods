// The pure part of prompt-drafts: the save marker, titles, the list, and every message in two languages.
import type { Draft } from '../types'

export const MAX = 50
export type Lang = 'en' | 'ko'

// The text before the marker when the prompt ends with it, else null.
export function marked(text: string, marker: string) {
  const t = text.trimEnd()
  if (!marker || !t.endsWith(marker)) return null
  return t.slice(0, -marker.length).trimEnd()
}

export function title(text: string) {
  const line = text.split('\n').map(l => l.trim()).find(Boolean) ?? ''
  return line.length > 48 ? `${line.slice(0, 48)}…` : line
}

export function project(root: string) {
  return root.split('/').filter(Boolean).pop() ?? '/'
}

// Newest first; saving the same text again moves it to the top instead of keeping two.
export function add(list: readonly Draft[], d: Draft) {
  return [d, ...list.filter(x => x.text !== d.text)].slice(0, MAX)
}

export function ago(now: number, at: number, lang: Lang) {
  const m = Math.max(0, Math.round((now - at) / 60000))
  const [h, d] = [Math.floor(m / 60), Math.floor(m / 1440)]
  if (lang === 'ko') return m < 1 ? '방금' : m < 60 ? `${m}분 전` : h < 24 ? `${h}시간 전` : `${d}일 전`
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : h < 24 ? `${h}h ago` : `${d}d ago`
}

export const text = {
  en: {
    saved: (n: number, t: string) => `✓ Draft ${n} saved: ${t}   (/drafts to bring it back)`,
    empty: 'Nothing to save: the prompt is empty.',
    failed: 'The draft could not be saved, so the prompt was not sent either.',
    loaded: (n: number, t: string) => `Draft ${n} is in the prompt box: ${t}`,
    noBox: 'There is no prompt box here to put the draft in.',
    stashed: 'What was in the prompt box was kept as a draft first.',
    removed: (t: string) => `Deleted: ${t}`,
    missing: (n: string) => `There is no draft ${n}.`,
    none: (m: string) => `No drafts yet. End a prompt with ${m} and press Enter to keep it aside.`,
    usage: 'Usage: /drafts, /drafts <n>, /drafts rm <n>',
    draftUsage: (m: string) => `Usage: /draft <text>. Or end the prompt you are writing with ${m} and press Enter.`,
    pane: 'Drafts',
    paneHint: (m: string) => `s saves the prompt box, 1-9 puts a draft in it, or end a prompt with ${m}`,
    saveButton: 'Save prompt box',
    meta: (p: string, a: string, n: number) => `${p}, ${a}, ${n} chars`,
    cmdDraft: (m: string) => `Save a prompt as a draft: /draft <text>, or end any prompt with ${m}`,
    cmdDrafts: 'Your drafts: open the pane, /drafts <n> to use one, /drafts rm <n> to delete',
  },
  ko: {
    saved: (n: number, t: string) => `✓ ${n}번에 임시저장: ${t}   (/drafts 로 꺼내기)`,
    empty: '입력창이 비어 있어 저장하지 않았습니다.',
    failed: '임시저장에 실패해서 보내지도 않았습니다.',
    loaded: (n: number, t: string) => `${n}번을 입력창에 넣었습니다: ${t}`,
    noBox: '여기에는 꺼낸 프롬프트를 넣을 입력창이 없습니다.',
    stashed: '입력창에 있던 내용은 먼저 임시저장해 두었습니다.',
    removed: (t: string) => `지웠습니다: ${t}`,
    missing: (n: string) => `${n}번 임시저장이 없습니다.`,
    none: (m: string) => `임시저장한 프롬프트가 없습니다. 프롬프트 끝에 ${m} 를 붙이고 Enter 하면 저장됩니다.`,
    usage: '사용법: /drafts, /drafts <번호>, /drafts rm <번호>',
    draftUsage: (m: string) => `사용법: /draft <내용>. 또는 쓰던 프롬프트 끝에 ${m} 를 붙이고 Enter.`,
    pane: '임시저장',
    paneHint: (m: string) => `s 입력창 저장, 1-9 꺼내기, 또는 프롬프트 끝에 ${m}`,
    saveButton: '입력창 저장',
    meta: (p: string, a: string, n: number) => `${p}, ${a}, ${n}자`,
    cmdDraft: (m: string) => `프롬프트 임시저장: /draft <내용>, 또는 프롬프트 끝에 ${m}`,
    cmdDrafts: '임시저장 목록: 창 열기, /drafts <번호> 로 꺼내기, /drafts rm <번호> 로 지우기',
  },
} satisfies Record<Lang, Record<string, unknown>>

export function listText(list: readonly Draft[], now: number, lang: Lang, marker: string) {
  const t = text[lang]
  if (!list.length) return t.none(marker)
  return list.map((d, i) => `${String(i + 1).padStart(2)}  ${d.title}  (${t.meta(d.project, ago(now, d.savedAt, lang), d.text.length)})`).join('\n')
}
