// prompt-drafts: keep prompts aside as drafts and bring them back later.
//   Save:  end a prompt with ";;" and press Enter: it is saved, not sent.
//          Or "/draft <text>", or press "s" in the drafts pane to save what is in the prompt box.
//   Use:   "/drafts" opens the pane: 1-9 (or a click) puts a draft in the prompt box, × deletes one.
//          "/drafts <n>" puts draft n in the prompt box; "/drafts rm <n>" deletes it.
// Drafts live in this plugin's store on this machine, shared by every session, newest first, 50 at most.
// Putting a draft in a prompt box that already holds text keeps that text as a draft first, so nothing is lost.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { Draft } from '../types'
import { add, ago, listText, MARKER, marked, project, text, title, type Lang } from './drafts'

const PANE = 'prompt-drafts'
const KEY = 'drafts'
const drafts = atom({ plugin: 'prompt-drafts', key: 'drafts' } as const, [])

let lang: Lang = 'en'
const marker = MARKER

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

async function saveBox($: EngineInterface) {
  const { text: body } = await $.prompt.read()
  if (!body.trim()) return $.ui.toast(text[lang].empty)
  const d = await save($, body)
  await $.prompt.fill({ text: '', mode: 'replace' })
  $.ui.toast(text[lang].saved(1, d.title))
}

export const register: Register = (on, options) => {
  lang = options.language === 'ko' ? 'ko' : 'en'
  const t = text[lang]

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'draft', description: t.cmdDraft(marker), argumentHint: '<text>' })
    await $.command.register({ name: 'drafts', description: t.cmdDrafts, argumentHint: '[n | rm n]' })
    void load($)
    return next(e)
  })

  // A typed prompt ending with the marker is saved and not sent.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin && e.origin.kind !== 'composer') return next(e)
    const body = marked(e.text)
    if (body === null) return next(e)
    if (!body) return { drop: t.empty }
    await save($, body)
    return { drop: t.saved(1, title(body)) }
  }).catch(($, e, next) => (next.called ? next(e) : { drop: t.failed }))

  on('command.run', { command: 'draft' }, async ($, e) => {
    const body = e.args.trim()
    if (!body) return { text: t.draftUsage(marker) }
    const d = await save($, body)
    return { text: t.saved(1, d.title) }
  })

  on('command.run', { command: 'drafts' }, async ($, e) => {
    const list = await load($)
    const args = e.args.trim()
    const nth = (s: string) => list[Number(s) - 1]
    if (!args) {
      await $.ui.open({ id: PANE, title: t.pane })
      return { text: listText(list, await $.clock.now(), lang, marker) }
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

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, drafts)
    const now = await $.clock.now()
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 24) - 4) / 2))
    return (
      <Box flexDirection="column">
        <Box>
          <Button key="save" label={t.saveButton} hotkey="s" onPress={() => saveBox($)} />
        </Box>
        <Text dimColor>{t.paneHint(marker)}</Text>
        <Text> </Text>
        {list.length === 0 && <Text dimColor>{t.none(marker)}</Text>}
        {list.slice(0, room).map((d, i) => (
          <Box flexDirection="column" key={d.id}>
            <Button
              key={`use-${d.id}`}
              label={i < 9 ? d.title : `${i + 1}  ${d.title}`}
              hotkey={i < 9 ? String(i + 1) : undefined}
              plain
              onPress={() => use($, d)}
            />
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
