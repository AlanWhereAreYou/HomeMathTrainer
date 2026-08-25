import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import {
  defaultChallengeConfig,
  generateQuestion,
  nextStreak,
  parseIntegerAnswer,
} from '@homemath/challenge-engine'

interface Session {
  id: string
  streak: number
  passed: boolean
  currentQuestion: ReturnType<typeof generateQuestion>
  recentFingerprints: string[]
  lastResultBySubmission: Map<string, AnswerResponse>
}

interface StartResponse {
  sessionId: string
  streak: number
  targetStreak: number
  passed: boolean
  question: {
    id: string
    expression: string
  }
}

interface AnswerRequest {
  questionId: string
  userAnswer: string
}

interface AnswerResponse {
  questionId: string
  submittedAnswer: string
  parsedAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  streak: number
  targetStreak: number
  passed: boolean
  parseError: string | null
  nextQuestion: {
    id: string
    expression: string
  } | null
}

const sessions = new Map<string, Session>()
const targetStreak = 15

function appendFingerprint(
  history: string[],
  fingerprint: string,
): string[] {
  const next = [...history, fingerprint]
  if (next.length <= defaultChallengeConfig.maxRecentFingerprints) {
    return next
  }

  return next.slice(next.length - defaultChallengeConfig.maxRecentFingerprints)
}

function pickQuestion(recentFingerprints: string[]) {
  return generateQuestion(recentFingerprints, defaultChallengeConfig)
}

function createSession(): Session {
  const firstQuestion = pickQuestion([])

  return {
    id: randomUUID(),
    streak: 0,
    passed: false,
    currentQuestion: firstQuestion,
    recentFingerprints: [firstQuestion.fingerprint],
    lastResultBySubmission: new Map(),
  }
}

function buildSubmissionKey(questionId: string, userAnswer: string): string {
  return `${questionId}::${userAnswer}`
}

function sessionMissingResponse(questionId: string, submittedAnswer: string): AnswerResponse {
  return {
    questionId,
    submittedAnswer,
    parsedAnswer: null,
    correctAnswer: 0,
    isCorrect: false,
    streak: 0,
    targetStreak,
    passed: false,
    parseError: 'Session not found',
    nextQuestion: null,
  }
}

export function buildApp() {
  const app = Fastify({ logger: false })
  const frontendRoot = path.join(process.cwd(), 'apps', 'web', 'dist')
  const indexHtmlPath = path.join(frontendRoot, 'index.html')

  app.get('/health', async () => ({ ok: true }))

  app.post('/api/session/start', async (): Promise<StartResponse> => {
    const session = createSession()
    sessions.set(session.id, session)

    return {
      sessionId: session.id,
      streak: session.streak,
      targetStreak,
      passed: session.passed,
      question: {
        id: session.currentQuestion.id,
        expression: session.currentQuestion.expression,
      },
    }
  })

  app.post<{ Params: { sessionId: string }; Body: AnswerRequest }>(
    '/api/session/:sessionId/answer',
    async (request, reply): Promise<AnswerResponse> => {
      const session = sessions.get(request.params.sessionId)

      if (!session) {
        return reply
          .code(404)
          .send(sessionMissingResponse(request.body.questionId, request.body.userAnswer))
      }

      const submissionKey = buildSubmissionKey(
        request.body.questionId,
        request.body.userAnswer,
      )
      const cached = session.lastResultBySubmission.get(submissionKey)
      if (cached) {
        return cached
      }

      if (request.body.questionId !== session.currentQuestion.id) {
        return reply.code(409).send({
          questionId: request.body.questionId,
          submittedAnswer: request.body.userAnswer,
          parsedAnswer: null,
          correctAnswer: session.currentQuestion.answer,
          isCorrect: false,
          streak: session.streak,
          targetStreak,
          passed: session.passed,
          parseError: 'Stale question. Use the current question.',
          nextQuestion: {
            id: session.currentQuestion.id,
            expression: session.currentQuestion.expression,
          },
        })
      }

      const parsed = parseIntegerAnswer(request.body.userAnswer)
      const gradedQuestion = session.currentQuestion
      const isCorrect =
        parsed.accepted && parsed.parsedAnswer === gradedQuestion.answer

      const newStreak = nextStreak(session.streak, isCorrect)
      const passed = newStreak >= targetStreak

      session.streak = newStreak
      session.passed = passed

      let nextQuestion: { id: string; expression: string } | null = null

      if (!passed && isCorrect) {
        const generated = pickQuestion(session.recentFingerprints)
        session.recentFingerprints = appendFingerprint(
          session.recentFingerprints,
          generated.fingerprint,
        )
        session.currentQuestion = generated
        nextQuestion = {
          id: generated.id,
          expression: generated.expression,
        }
      } else if (!passed) {
        // Retry the same question after an incorrect attempt.
        nextQuestion = {
          id: gradedQuestion.id,
          expression: gradedQuestion.expression,
        }
      }

      const response: AnswerResponse = {
        questionId: gradedQuestion.id,
        submittedAnswer: request.body.userAnswer,
        parsedAnswer: parsed.parsedAnswer,
        correctAnswer: gradedQuestion.answer,
        isCorrect,
        streak: newStreak,
        targetStreak,
        passed,
        parseError: parsed.parseError,
        nextQuestion,
      }

      // Persist exact response for idempotent duplicate submissions.
      session.lastResultBySubmission.set(submissionKey, response)

      return response
    },
  )

  if (existsSync(indexHtmlPath)) {
    app.register(fastifyStatic, {
      root: frontendRoot,
      prefix: '/',
      decorateReply: false,
    })

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url === '/health') {
        return reply.code(404).send({ error: 'Not Found' })
      }

      return reply.type('text/html; charset=utf-8').send(readFileSync(indexHtmlPath, 'utf8'))
    })
  }

  return app
}
