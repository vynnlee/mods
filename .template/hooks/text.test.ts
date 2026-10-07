import { expect, test } from 'claude-code/testing'
import { text } from './text'

test('both languages have the same messages', () => {
  expect(Object.keys(text.en).sort()).toEqual(Object.keys(text.ko).sort())
  expect(text.en.hello(2)).toContain('2 times')
})
