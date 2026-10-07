// prompt-drafts: keep prompts aside as drafts of this session and bring them back later.
//   Save:  end a prompt with ";;" and press Enter: it is saved, not sent. Or "/draft <text>".
//   Use:   "/drafts". On a wide terminal, a sidebar (click a draft, × deletes, Save prompt box) and a row of
//          numbered buttons above the prompt box: a bare digit in an empty prompt box presses one, 0 closes.
//          On a narrow one, Claude Code's own question dialog, a page at a time.
//          "/drafts <n>" puts draft n in the prompt box, "/drafts rm <n>" deletes it, "/drafts undo" brings it back.
// Each session has its own drafts (resuming the session brings them back); other sessions never see them.
// They live in this plugin's store, newest first, 50 per session; a session idle for 30 days is dropped.
// Putting a draft in a prompt box that already holds text saves that text as a draft first, so nothing is lost.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Deleted, Draft } from '../types'
import { add, ago, askPage, KEEP_MS, listText, MARKER, marked, preview, restore, text, title, type Lang } from './drafts'

const PANE = 'prompt-drafts'
const SHOWN = 9
// Below this many columns there is no room for the sidebar: drafts are picked in Claude Code's own question dialog.
const WIDE = 110
const drafts = atom({ plugin: 'prompt-drafts', key: 'drafts' } as const, [])
const isPicking = atom({ plugin: 'prompt-drafts', key: 'isPicking' } as const, false)
const deleted = atom({ plugin: 'prompt-drafts', key: 'deleted' } as const, null)

let lang: Lang = 'en'
let storeKey = ''

async function key($: EngineInterface) {
  if (!storeKey) storeKey = `session:${await $.session.id()}`
  return storeKey
}

async function load($: EngineInterface) {
  const list = ((await $.store.get(await key($))) as Draft[] | undefined) ?? []
  await update($, drafts, () => list)
  return list
}

async function store($: EngineInterface, list: Draft[]) {
  if (list.length) await $.store.set(await key($), list)
  else await $.store.delete(await key($))
  await update($, drafts, () => list)
}

async function save($: EngineInterface, body: string) {
  const now = await $.clock.now()
  const list = add(await load($), { id: String(now), title: title(body), text: body, savedAt: now })
  await store($, list)
  return list
}

async function remove($: EngineInterface, d: Draft) {
  const list = await load($)
  const index = list.findIndex(x => x.id === d.id)
  if (index < 0) return
  await store($, list.filter(x => x.id !== d.id))
  await update($, deleted, (): Deleted => ({ draft: d, index }))
}

async function undo($: EngineInterface) {
  const last = await read($, deleted)
  if (!last) return null
  await store($, restore(await load($), last.draft, last.index))
  await update($, deleted, () => null)
  return last.draft
}

// Drop the drafts of sessions idle for 30 days.
async function tidy($: EngineInterface) {
  const now = await $.clock.now()
  const mine = await key($)
  for (const k of await $.store.keys()) {
    if (!k.startsWith('session:') || k === mine) continue
    const list = ((await $.store.get(k)) as Draft[] | undefined) ?? []
    if (!list.some(d => now - d.savedAt < KEEP_MS)) await $.store.delete(k)
  }
}

// Put a draft in the prompt box, saving any other text that was there as a draft first.
async function use($: EngineInterface, d: Draft) {
  const box = await $.prompt.read()
  if (box.text.trim() && box.text.trim() !== d.text.trim() && marked(box.text) === null) {
    await save($, box.text)
    $.ui.toast(text[lang].stashed)
  }
  const done = await $.prompt.fill({ text: d.text, mode: 'replace' })
  return done.isFilled
}

// Picking puts the draft in the prompt box and closes both the sidebar and the number row.
async function pick($: EngineInterface, d: Draft) {
  await closePicker($)
  await use($, d)
}

async function closePicker($: EngineInterface) {
  await update($, isPicking, () => false)
  await update($, deleted, () => null)
  if ((await $.ui.panes()).some(p => p.id === PANE)) await $.ui.close({ id: PANE })
}

async function saveBox($: EngineInterface) {
  const { text: body } = await $.prompt.read()
  if (!body.trim()) return $.ui.toast(text[lang].empty)
  const list = await save($, body)
  await $.prompt.fill({ text: '', mode: 'replace' })
  $.ui.toast(text[lang].saved(list.length, title(body)))
}

async function undoFromPane($: EngineInterface) {
  const d = await undo($)
  if (d) $.ui.toast(text[lang].restored(d.title))
}

// Narrow terminals: Claude Code's own question dialog, a page at a time (it takes 2-4 options).
async function askPick($: EngineInterface, list: Draft[]) {
  const t = text[lang]
  let start = 0
  for (;;) {
    const { page, labels, hasMore, next } = askPage(list, start)
    const more = t.more(Math.min(3, list.length - next))
    let answer: string
    try {
      answer = await $.ui.ask(t.ask, { header: t.picker, options: hasMore ? [...labels, more] : labels.length > 1 ? labels : [...labels, t.close] })
    } catch {
      return null // dismissed
    }
    if (hasMore && answer === more) { start = next; continue }
    const i = labels.indexOf(answer)
    return i >= 0 ? page[i]! : null
  }
}

// The sidebar shows when it has room; the number row above the prompt is what the keys reach either way.
async function paneShown($: EngineInterface) {
  return (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced && p.isShown)
}

export const register: Register = (on, options) => {
  lang = options.language === 'ko' ? 'ko' : 'en'
  const t = text[lang]

  on('session.start', async ($, e, next) => {
    storeKey = ''
    await $.command.register({ name: 'draft', description: t.cmdDraft, argumentHint: '<text>' })
    await $.command.register({ name: 'drafts', description: t.cmdDrafts, argumentHint: '[n | rm n | undo]' })
    await load($)
    void tidy($)
    return next(e)
  })

  // A typed prompt ending with ";;" is saved and not sent. Any prompt also closes the list.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin && e.origin.kind !== 'composer') return next(e)
    await update($, isPicking, () => false)
    const body = marked(e.text)
    if (body === null) return next(e)
    if (!body) return { drop: t.empty }
    const list = await save($, body)
    return { drop: t.saved(list.length, title(body)) }
  }).catch(($, e, next) => (next.called ? next(e) : { drop: t.failed }))

  on('command.run', { command: 'draft' }, async ($, e) => {
    const body = e.args.trim()
    if (!body) return { text: t.draftUsage }
    const list = await save($, body)
    return { text: t.saved(list.length, title(body)) }
  })

  on('command.run', { command: 'drafts' }, async ($, e) => {
    const list = await load($)
    const args = e.args.trim()
    const nth = (s: string) => list[Number(s) - 1]
    if (!args) {
      const drawn = (await $.session.surface()) !== null
      if (!list.length || !drawn) return { text: listText(list, await $.clock.now(), lang) }
      if (e.presentation.columns < WIDE) {
        const d = await askPick($, list)
        if (!d) return { text: t.closed }
        return { text: (await use($, d)) ? t.loaded(d.title) : t.noBox }
      }
      await $.ui.open({ id: PANE, title: t.picker })
      await update($, isPicking, () => true)
      return { text: (await paneShown($)) ? t.openedWide : t.openedNarrow }
    }
    if (args === 'undo') {
      const d = await undo($)
      return { text: d ? t.restored(d.title) : t.noUndo }
    }
    const rm = args.match(/^rm\s+(\d+)$/)
    if (rm) {
      const d = nth(rm[1]!)
      if (!d) return { text: t.missing(rm[1]!) }
      await remove($, d)
      return { text: t.removed(d.title) }
    }
    if (/^\d+$/.test(args)) {
      const d = nth(args)
      if (!d) return { text: t.missing(args) }
      return { text: (await use($, d)) ? t.loaded(d.title) : t.noBox }
    }
    return { text: t.usage }
  })

  // Closing the sidebar (its ×, or Escape) closes the number row too.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, isPicking, () => false)
    await update($, deleted, () => null)
    return next(e)
  })

  // Above the prompt: a bare digit in an empty prompt box presses one of these buttons. With the sidebar shown it is
  // one row of numbers; without it it is the whole list.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isPicking))) return next(e)
    const list = (await read($, drafts)).slice(0, SHOWN)
    if (!list.length) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    if (await paneShown($)) {
      return (
        <Box>
          <Text bold>{t.picker}</Text>
          <Text dimColor>  {t.keysHint}  </Text>
          {list.map((d, i) => (
            <Button key={`use-${d.id}`} label={`${d.title.slice(0, 12)}${d.title.length > 12 ? '…' : ''}  `} hotkey={String(i + 1)} plain onPress={() => pick($, d)} />
          ))}
          <Button key="close" label={t.close} hotkey="0" plain onPress={() => closePicker($)} />
        </Box>
      )
    }
    const now = await $.clock.now()
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>{t.picker}</Text>
          <Text dimColor>  {t.pickHint}</Text>
        </Box>
        {list.map((d, i) => (
          <Box key={d.id}>
            <Button key={`use-${d.id}`} label={d.title} hotkey={String(i + 1)} plain onPress={() => pick($, d)} />
            <Text dimColor>   {t.meta(ago(now, d.savedAt, lang), d.text.length)}</Text>
          </Box>
        ))}
        <Button key="close" label={t.close} hotkey="0" plain onPress={() => closePicker($)} />
      </Box>
    )
  })

  // The sidebar: this session's drafts with up to three lines each, click to use, × to delete, undo the last delete.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, drafts)
    const gone = await read($, deleted)
    const now = await $.clock.now()
    const width = Math.max(20, (e.viewport?.columns ?? 60) - 6)
    let rows = Math.max(4, (e.viewport?.rows ?? 24) - (gone ? 6 : 4))
    const shown: { d: Draft; i: number; more: string[] }[] = []
    for (const [i, d] of list.entries()) {
      const more = preview(d.text, width)
      if (rows < more.length + 2) break
      rows -= more.length + 2
      shown.push({ d, i, more })
    }
    return (
      <Box flexDirection="column">
        <Button key="save" label={t.saveButton} onPress={() => saveBox($)} />
        <Text dimColor>{t.paneHint}</Text>
        {gone && (
          <Box>
            <Text dimColor>{t.deletedLine(gone.draft.title.slice(0, 24))}  </Text>
            <Button key="undo" label={t.undoButton} plain onPress={() => undoFromPane($)} />
          </Box>
        )}
        <Text> </Text>
        {list.length === 0 && <Text dimColor>{t.none}</Text>}
        {shown.map(({ d, i, more }) => (
          <Box flexDirection="column" key={d.id}>
            <Button key={`pane-${d.id}`} label={`${i + 1}  ${d.title}`} plain onPress={() => pick($, d)} />
            {more.map(line => <Text dimColor>   {line}</Text>)}
            <Box>
              <Text dimColor>   {t.meta(ago(now, d.savedAt, lang), d.text.length)}  </Text>
              <Button key={`rm-${d.id}`} label="×" plain onPress={() => remove($, d)} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  })
}
