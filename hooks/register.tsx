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
import { add, ago, listText, MARKER, marked, project, text, title, type Lang } from './drafts'

const KEY = 'drafts'
const SHOWN = 9
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

async function pick($: EngineInterface, d: Draft) {
  await update($, isPicking, () => false)
  await use($, d)
}

async function closePicker($: EngineInterface) {
  await update($, isPicking, () => false)
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

  // The list, above the prompt. Each Button's hotkey is its number; 0 closes.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isPicking))) return next(e)
    const list = (await read($, drafts)).slice(0, SHOWN)
    if (!list.length) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
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
}
