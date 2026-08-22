import { describe, expect, it } from 'vitest'
import {
  defaultChallengeConfig,
  generateQuestion,
  nextStreak,
  parseIntegerAnswer,
} from './index.js'

describe('parseIntegerAnswer', () => {
  it('accepts signed integers', () => {
    expect(parseIntegerAnswer('+12')).toEqual({
      accepted: true,
      parsedAnswer: 12,
      parseError: null,
    })
    expect(parseIntegerAnswer('-7')).toEqual({
      accepted: true,
      parsedAnswer: -7,
      parseError: null,
    })
  })

  it('rejects invalid values', () => {
    expect(parseIntegerAnswer('')).toEqual({
      accepted: false,
      parsedAnswer: null,
      parseError: 'Answer is empty',
    })
    expect(parseIntegerAnswer('1.2')).toEqual({
      accepted: false,
      parsedAnswer: null,
      parseError: 'Answer must be a whole number',
    })
  })
})

describe('nextStreak', () => {
  it('increments on correct and resets on wrong', () => {
    expect(nextStreak(3, true)).toBe(4)
    expect(nextStreak(19, true)).toBe(20)
    expect(nextStreak(12, false)).toBe(0)
  })
})

describe('generateQuestion', () => {
  it('generates operands in configured range and bracketed expression', () => {
    const q = generateQuestion([], defaultChallengeConfig)
    expect(q.expression).toMatch(/^\([+-]\d+\) [+-] \([+-]\d+\)$/)

    const [, aStr, op, bStr] = q.expression.match(/^\(([+-]\d+)\) ([+-]) \(([+-]\d+)\)$/) ?? []
    const a = Number.parseInt(aStr, 10)
    const b = Number.parseInt(bStr, 10)

    expect(a).toBeGreaterThanOrEqual(defaultChallengeConfig.minOperand)
    expect(a).toBeLessThanOrEqual(defaultChallengeConfig.maxOperand)
    expect(b).toBeGreaterThanOrEqual(defaultChallengeConfig.minOperand)
    expect(b).toBeLessThanOrEqual(defaultChallengeConfig.maxOperand)

    const expected = op === '+' ? a + b : a - b
    expect(q.answer).toBe(expected)
  })
})
