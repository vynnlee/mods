// prompt-drafts: keep prompts aside as drafts and bring them back later.
//   Save:  end a prompt with ";;" and press Enter: it is saved, not sent. Or "/draft <text>".
//   Use:   "/drafts" lists your drafts right above the prompt box; press a number to put that draft in the box
//          (a bare digit in an empty prompt box presses a button of that band), 0 to close the list.
//          "/drafts <n>" does the same without the list; "/drafts rm <n>" deletes draft n.
// Drafts live in this plugin's store on this machine, shared by every session, newest first, 50 at most.
// Putting a draft in a prompt box that already holds text keeps that text as a draft first, so nothing is lost.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Draft } from '../types'
import { add, ago, askPage, listText, MARKER, marked, project, text, title, type Lang } from './drafts'

const KEY = 'drafts'
const PANE = 'prompt-drafts'
const SHOWN = 9
// Below this many columns there is no room for the sidebar: the draft is picked in Claude Code's own question dialog.
const WIDE = 110
const drafts = atom({ plugin: 'prompt-drafts', key: 'drafts' } as const, [])
const isPicking = atom({ plugin: 'prompt-drafts', key: 'isPicking' } as const, false)

let lang: Lang = 'en'

async function load($: EngineInterface) {
  const list = ((await $.store.get(KEY)) as Draft[] | undefined) ?? []
  await update($, drafts, () => list)
  return list
}

async function store($: EngineInterface, list: Draft[]) {
  await $.store.set(KEY, list)
  await update($, drafts, () => list)
}

async function save($: EngineInterface, body: string) {
  const now = await $.clock.now()
  const list = add(await load($), { id: String(now), title: title(body), text: body, savedAt: now, project: project(await $.session.root()) })
  await store($, list)
  return list[0]!
}

async function remove($: EngineInterface, id: string) {
  await store($, (await load($)).filter(d => d.id !== id))
}

// Put a draft in the prompt box, keeping any other text that was there as a draft first.
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
  if ((await $.ui.panes()).some(p => p.id === PANE)) await $.ui.close({ id: PANE })
}

async function saveBox($: EngineInterface) {
  const { text: body } = await $.prompt.read()
  if (!body.trim()) return $.ui.toast(text[lang].empty)
  await save($, body)
  await $.prompt.fill({ text: '', mode: 'replace' })
  $.ui.toast(text[lang].saved(1, title(body)))
}

// Narrow terminals: Claude Code's own question dialog, a page at a time (it takes 2-4 options).
async function askPick($: EngineInterface, list: Draft[]) {
  const t = text[lang]
  let start = 0
  for (;;) {
    const { page, labels, hasMore, next } = askPage(list, start)
    let answer: string
    try {
      answer = await $.ui.ask(t.ask, { header: t.picker, options: hasMore ? [...labels, t.more(Math.min(3, list.length - next))] : labels.length > 1 ? labels : [...labels, t.close] })
    } catch {
      return null // dismissed
    }
    if (hasMore && answer === t.more(Math.min(3, list.length - next))) { start = next; continue }
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
    await $.command.register({ name: 'draft', description: t.cmdDraft(MARKER), argumentHint: '<text>' })
    await $.command.register({ name: 'drafts', description: t.cmdDrafts, argumentHint: '[n | rm n]' })
    void load($)
    return next(e)
  })

  // A typed prompt ending with ";;" is saved and not sent. Any prompt also closes the list.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin && e.origin.kind !== 'composer') return next(e)
    await update($, isPicking, () => false)
    const body = marked(e.text)
    if (body === null) return next(e)
    if (!body) return { drop: t.empty }
    await save($, body)
    return { drop: t.saved(1, title(body)) }
  }).catch(($, e, next) => (next.called ? next(e) : { drop: t.failed }))

  on('command.run', { command: 'draft' }, async ($, e) => {
    const body = e.args.trim()
    if (!body) return { text: t.draftUsage(MARKER) }
    const d = await save($, body)
    return { text: t.saved(1, d.title) }
  })

  on('command.run', { command: 'drafts' }, async ($, e) => {
    const list = await load($)
    const args = e.args.trim()
    const nth = (s: string) => list[Number(s) - 1]
    if (!args) {
      // Where a band is drawn (terminal, desktop) the list waits above the prompt for a number.
      const drawn = (await $.session.surface()) !== null
      if (!list.length || !drawn) return { text: listText(list, await $.clock.now(), lang, MARKER) }
      if (e.presentation.columns < WIDE) {
        const d = await askPick($, list)
        if (!d) return { text: t.closed }
        return { text: (await use($, d)) ? t.loaded(list.indexOf(d) + 1, d.title) : t.noBox }
      }
      await $.ui.open({ id: PANE, title: t.picker })
      await update($, isPicking, () => true)
      return { text: t.opened(Math.min(list.length, SHOWN)) }
    }
    const rm = args.match(/^rm\s+(\d+)$/)
    if (rm) {
      const d = nth(rm[1]!)
      if (!d) return { text: t.missing(rm[1]!) }
      await remove($, d.id)
      return { text: t.removed(d.title) }
    }
    if (/^\d+$/.test(args)) {
      const d = nth(args)
      if (!d) return { text: t.missing(args) }
      return { text: (await use($, d)) ? t.loaded(Number(args), d.title) : t.noBox }
    }
    return { text: t.usage }
  })

  // Closing the sidebar (its ×, or Escape) closes the number row too.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, isPicking, () => false)
    return next(e)
  })

  // Above the prompt: a bare digit in an empty prompt box presses one of these buttons. With the sidebar shown it is
  // one row of numbers; without it (a narrow terminal) it is the whole list.
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
            <Text dimColor>   {t.meta(d.project, ago(now, d.savedAt, lang), d.text.length)}</Text>
          </Box>
        ))}
        <Button key="close" label={t.close} hotkey="0" plain onPress={() => closePicker($)} />
      </Box>
    )
  })

  // The sidebar: every draft, click to use one, × to delete, and a button that saves what is in the prompt box.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, drafts)
    const now = await $.clock.now()
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 24) - 5) / 2))
    return (
      <Box flexDirection="column">
        <Button key="save" label={t.saveButton} onPress={() => saveBox($)} />
        <Text dimColor>{t.paneHint}</Text>
        <Text> </Text>
        {list.length === 0 && <Text dimColor>{t.none(MARKER)}</Text>}
        {list.slice(0, room).map((d, i) => (
          <Box flexDirection="column" key={d.id}>
            <Button key={`pane-${d.id}`} label={`${i + 1}  ${d.title}`} plain onPress={() => pick($, d)} />
            <Box>
              <Text dimColor>   {t.meta(d.project, ago(now, d.savedAt, lang), d.text.length)}  </Text>
              <Button key={`rm-${d.id}`} label="×" plain onPress={() => remove($, d.id)} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  })
}
