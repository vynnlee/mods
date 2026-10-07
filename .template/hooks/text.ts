// The pure part of the mod: logic and every message in both languages. Tested in text.test.ts.
export type Lang = 'en' | 'ko'

export const text = {
  en: {
    cmd: 'Say hello',
    hello: (n: number) => `Hello. This session has run /my-mod ${n} times.`,
  },
  ko: {
    cmd: '인사하기',
    hello: (n: number) => `안녕하세요. 이 세션에서 /my-mod 를 ${n}번 실행했습니다.`,
  },
} satisfies Record<Lang, Record<string, unknown>>
