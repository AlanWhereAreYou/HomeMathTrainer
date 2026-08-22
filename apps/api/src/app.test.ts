import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

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
})
