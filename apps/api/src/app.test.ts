import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

function solveExpression(expression: string): number {
  const match = expression.match(/^\(([+-]?\d+)\)\s([+-])\s\(([+-]?\d+)\)$/)
  if (!match) {
    throw new Error(`Unexpected expression format: ${expression}`)
  }

  const left = Number.parseInt(match[1], 10)
  const operator = match[2]
  const right = Number.parseInt(match[3], 10)

  return operator === '+' ? left + right : left - right
}

describe('API challenge flow', () => {
  it('starts a session and validates answer behavior', async () => {
    const app = buildApp()

    try {
      const start = await app.inject({
        method: 'POST',
        url: '/api/session/start',
      })

      expect(start.statusCode).toBe(200)
      const startPayload = start.json()
      expect(startPayload.streak).toBe(0)

      const bad = await app.inject({
        method: 'POST',
        url: `/api/session/${startPayload.sessionId}/answer`,
        payload: {
          questionId: startPayload.question.id,
          userAnswer: 'not-a-number',
        },
      })

      expect(bad.statusCode).toBe(200)
      const badPayload = bad.json()
      expect(badPayload.isCorrect).toBe(false)
      expect(badPayload.streak).toBe(0)
    } finally {
      await app.close()
    }
  }, 15000)

  it('resets streak and keeps same question after incorrect answer', async () => {
    const app = buildApp()

    try {
      const start = await app.inject({
        method: 'POST',
        url: '/api/session/start',
      })

      expect(start.statusCode).toBe(200)
      const startPayload = start.json()

      const wrong = await app.inject({
        method: 'POST',
        url: `/api/session/${startPayload.sessionId}/answer`,
        payload: {
          questionId: startPayload.question.id,
          userAnswer: '9999',
        },
      })

      expect(wrong.statusCode).toBe(200)
      const wrongPayload = wrong.json()
      expect(wrongPayload.isCorrect).toBe(false)
      expect(wrongPayload.streak).toBe(0)
      expect(wrongPayload.nextQuestion).toEqual(startPayload.question)

      const corrected = await app.inject({
        method: 'POST',
        url: `/api/session/${startPayload.sessionId}/answer`,
        payload: {
          questionId: startPayload.question.id,
          userAnswer: String(wrongPayload.correctAnswer),
        },
      })

      expect(corrected.statusCode).toBe(200)
      const correctedPayload = corrected.json()
      expect(correctedPayload.isCorrect).toBe(true)
      expect(correctedPayload.streak).toBe(1)
      expect(correctedPayload.nextQuestion).not.toBeNull()
      expect(correctedPayload.nextQuestion.id).not.toBe(startPayload.question.id)
    } finally {
      await app.close()
    }
  }, 15000)

  it('increments streak when the submitted answer is correct', async () => {
    const app = buildApp()

    try {
      const start = await app.inject({
        method: 'POST',
        url: '/api/session/start',
      })

      expect(start.statusCode).toBe(200)
      const startPayload = start.json()
      const correctAnswer = solveExpression(startPayload.question.expression)

      const result = await app.inject({
        method: 'POST',
        url: `/api/session/${startPayload.sessionId}/answer`,
        payload: {
          questionId: startPayload.question.id,
          userAnswer: String(correctAnswer),
        },
      })

      expect(result.statusCode).toBe(200)
      const resultPayload = result.json()
      expect(resultPayload.isCorrect).toBe(true)
      expect(resultPayload.streak).toBe(1)
      expect(resultPayload.passed).toBe(false)
      expect(resultPayload.nextQuestion).not.toBeNull()
    } finally {
      await app.close()
    }
  }, 15000)

  it('returns passed=true when streak reaches 15', async () => {
    const app = buildApp()

    try {
      const start = await app.inject({
        method: 'POST',
        url: '/api/session/start',
      })

      expect(start.statusCode).toBe(200)
      const startPayload = start.json()

      let currentQuestion = startPayload.question
      for (let expectedStreak = 1; expectedStreak <= 15; expectedStreak += 1) {
        const correctAnswer = solveExpression(currentQuestion.expression)
        const answer = await app.inject({
          method: 'POST',
          url: `/api/session/${startPayload.sessionId}/answer`,
          payload: {
            questionId: currentQuestion.id,
            userAnswer: String(correctAnswer),
          },
        })

        expect(answer.statusCode).toBe(200)
        const payload = answer.json()
        expect(payload.isCorrect).toBe(true)
        expect(payload.streak).toBe(expectedStreak)

        if (expectedStreak < 15) {
          expect(payload.passed).toBe(false)
          expect(payload.nextQuestion).not.toBeNull()
          currentQuestion = payload.nextQuestion
        } else {
          expect(payload.passed).toBe(true)
          expect(payload.nextQuestion).toBeNull()
        }
      }
    } finally {
      await app.close()
    }
  }, 15000)
})
