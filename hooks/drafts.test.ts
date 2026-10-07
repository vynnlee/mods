import { expect, test } from 'claude-code/testing'
import { add, ago, listText, marked, project, text, title } from './drafts'

const d = (i: number, body = `t${i}`) => ({ id: `${i}`, title: body, text: body, savedAt: i, project: 'app' })

test('the marker at the end saves, anywhere else it does not', () => {
  expect(marked('write the release notes ;;', ';;')).toBe('write the release notes')
  expect(marked('two lines\nof prompt;;  ', ';;')).toBe('two lines\nof prompt')
  expect(marked('a;; in the middle', ';;')).toBe(null)
  expect(marked(';;', ';;')).toBe('')
  expect(marked('custom marker //save', '//save')).toBe('custom marker')
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
