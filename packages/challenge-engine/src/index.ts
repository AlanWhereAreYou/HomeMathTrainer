import { randomUUID } from 'node:crypto'

export interface ChallengeConfig {
  minOperand: number
  maxOperand: number
  maxRecentFingerprints: number
}

export interface ChallengeQuestion {
  id: string
  expression: string
  answer: number
  fingerprint: string
}

export interface AnswerEvaluation {
  accepted: boolean
  parsedAnswer: number | null
  parseError: string | null
}

export const defaultChallengeConfig: ChallengeConfig = {
  minOperand: -20,
  maxOperand: 20,
  maxRecentFingerprints: 15,
}

const operators = ['+', '-'] as const

type Operator = (typeof operators)[number]

function randomInt(min: number, max: number): number {
  const low = Math.ceil(min)
  const high = Math.floor(max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function buildExpression(a: number, operator: Operator, b: number): string {
  return `(${formatSigned(a)}) ${operator} (${formatSigned(b)})`
}

export function generateQuestion(
  recentFingerprints: string[],
  config: ChallengeConfig = defaultChallengeConfig,
): ChallengeQuestion {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const a = randomInt(config.minOperand, config.maxOperand)
    const b = randomInt(config.minOperand, config.maxOperand)
    const operator = operators[randomInt(0, operators.length - 1)]

    const answer = operator === '+' ? a + b : a - b
    const fingerprint = `${a}|${operator}|${b}`

    if (recentFingerprints.includes(fingerprint)) {
      continue
    }

    return {
      id: randomUUID(),
      expression: buildExpression(a, operator, b),
      answer,
      fingerprint,
    }
  }

  const a = randomInt(config.minOperand, config.maxOperand)
  const b = randomInt(config.minOperand, config.maxOperand)
  const operator = operators[randomInt(0, operators.length - 1)]

  return {
    id: randomUUID(),
    expression: buildExpression(a, operator, b),
    answer: operator === '+' ? a + b : a - b,
    fingerprint: `${a}|${operator}|${b}`,
  }
}

export function parseIntegerAnswer(input: string): AnswerEvaluation {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    return { accepted: false, parsedAnswer: null, parseError: 'Answer is empty' }
  }

  if (!/^[+-]?\d+$/.test(trimmed)) {
    return {
      accepted: false,
      parsedAnswer: null,
      parseError: 'Answer must be a whole number',
    }
  }

  const value = Number.parseInt(trimmed, 10)

  if (!Number.isFinite(value)) {
    return {
      accepted: false,
      parsedAnswer: null,
      parseError: 'Answer is not a valid integer',
    }
  }

  return { accepted: true, parsedAnswer: value, parseError: null }
}

export function nextStreak(currentStreak: number, isCorrect: boolean): number {
  return isCorrect ? currentStreak + 1 : 0
}
