import { expect, test } from 'claude-code/testing'
import { add, ago, askPage, listText, marked, project, text, title } from './drafts'

const d = (i: number, body = `t${i}`) => ({ id: `${i}`, title: body, text: body, savedAt: i, project: 'app' })

test('the marker at the end saves, anywhere else it does not', () => {
  expect(marked('write the release notes ;;')).toBe('write the release notes')
  expect(marked('two lines\nof prompt;;  ')).toBe('two lines\nof prompt')
  expect(marked('a;; in the middle')).toBe(null)
  expect(marked(';;')).toBe('')
})

test('title is the first non-empty line, cut at 48', () => {
  expect(title('\n  first line\nsecond')).toBe('first line')
  expect(title('a'.repeat(60))).toBe('a'.repeat(48) + '…')
  expect(project('/Users/me/Developer/app')).toBe('app')
})

test('newest first, saving the same text again moves it up, 50 at most', () => {
  let list = add([d(1), d(2)], d(3, 't2'))
  expect(list.map(x => x.id)).toEqual(['3', '1'])
  for (let i = 10; i < 70; i++) list = add(list, d(i))
  expect(list.length).toBe(50)
})

test('both languages read', () => {
  expect(ago(0, 0, 'en')).toBe('just now')
  expect(ago(3 * 3600000, 0, 'ko')).toBe('3시간 전')
  expect(listText([], 0, 'en', ';;')).toContain('End a prompt with ;;')
  expect(listText([d(1, 'fix the flaky test')], 60000, 'en', ';;')).toBe(' 1  fix the flaky test  (app, 1m ago, 18 chars)')
  expect(Object.keys(text.en).sort()).toEqual(Object.keys(text.ko).sort())
})

test('the question dialog takes 2-4 options: a page of drafts, with a next option when more remain', () => {
  const list = [1, 2, 3, 4, 5, 6, 7].map(i => d(i))
  const p1 = askPage(list, 0)
  expect(p1.labels).toEqual(['t1', 't2', 't3'])
  expect(p1.hasMore).toBe(true)
  const p3 = askPage(list, 6)
  expect(p3.labels).toEqual(['t7'])
  expect(askPage(list.slice(0, 4), 0).labels.length).toBe(4)
  expect(askPage([d(1, 'same'), d(2, 'same')], 0).labels).toEqual(['same', '2. same'])
})
