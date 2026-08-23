import { useEffect, useMemo, useState } from 'react'
import './App.css'

interface SessionStartResponse {
  sessionId: string
  streak: number
  targetStreak: number
  passed: boolean
  question: {
    id: string
    expression: string
  }
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

interface Feedback {
  submittedAnswer: string
  correctAnswer: number
  isCorrect: boolean
  parseError: string | null
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

const keypadRows = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['+/-', '0', 'back'],
] as const

const maxAnswerLength = 8
const startRetries = 20
const retryDelayMs = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function App() {
  const [sessionId, setSessionId] = useState('')
  const [questionId, setQuestionId] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [streak, setStreak] = useState(0)
  const [targetStreak, setTargetStreak] = useState(20)
  const [passed, setPassed] = useState(false)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [statusText, setStatusText] = useState('Starting challenge...')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !loading && !submitting && answer.trim().length > 0 && !passed
  const progressPct = useMemo(
    () => Math.min((streak / targetStreak) * 100, 100),
    [streak, targetStreak],
  )

  async function startSession() {
    setLoading(true)
    setStatusText('Starting challenge...')
    setFeedback(null)
    setAnswer('')

    for (let attempt = 1; attempt <= startRetries; attempt += 1) {
      try {
        if (attempt > 1) {
          setStatusText(`Waiting for API... (${attempt}/${startRetries})`)
        }

        const response = await fetch(`${API_BASE}/session/start`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Unable to start session')
        }

        const payload = (await response.json()) as SessionStartResponse
        setSessionId(payload.sessionId)
        setQuestionId(payload.question.id)
        setQuestionText(payload.question.expression)
        setStreak(payload.streak)
        setTargetStreak(payload.targetStreak)
        setPassed(payload.passed)
        setStatusText('Enter your answer and submit.')
        setLoading(false)
        return
      } catch {
        if (attempt === startRetries) {
          setStatusText('Could not start the challenge. Try again.')
          setLoading(false)
          return
        }

        await delay(retryDelayMs)
      }
    }
  }

  useEffect(() => {
    void startSession()
  }, [])

  function appendDigit(digit: string) {
    setAnswer((previous) => {
      const base = previous === '0' ? '' : previous
      if (base.length >= maxAnswerLength) {
        return base
      }
      return `${base}${digit}`
    })
  }

  function toggleSign() {
    setAnswer((previous) => {
      if (previous.length === 0) {
        return '-'
      }
      if (previous === '-') {
        return ''
      }
      return previous.startsWith('-') ? previous.slice(1) : `-${previous}`
    })
  }

  function backspace() {
    setAnswer((previous) => previous.slice(0, -1))
  }

  function clearAnswer() {
    setAnswer('')
  }

  function handleKeypadPress(value: string) {
    if (submitting || loading || passed) {
      return
    }

    if (value === '+/-') {
      toggleSign()
      return
    }

    if (value === 'back') {
      backspace()
      return
    }

    appendDigit(value)
  }

  async function submitAnswer() {
    if (!canSubmit || !sessionId || !questionId) {
      return
    }

    setSubmitting(true)
    setStatusText('Checking answer...')

    try {
      const response = await fetch(`${API_BASE}/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          userAnswer: answer,
        }),
      })

      if (!response.ok) {
        throw new Error('Unable to submit answer')
      }

      const payload = (await response.json()) as AnswerResponse
      setFeedback({
        submittedAnswer: payload.submittedAnswer,
        correctAnswer: payload.correctAnswer,
        isCorrect: payload.isCorrect,
        parseError: payload.parseError,
      })
      setStreak(payload.streak)
      setPassed(payload.passed)

      if (payload.nextQuestion) {
        setQuestionId(payload.nextQuestion.id)
        setQuestionText(payload.nextQuestion.expression)
      }

      setAnswer('')
      setStatusText(
        payload.passed
          ? 'Challenge complete. You reached 20 in a row.'
          : payload.isCorrect
            ? 'Correct. Keep going.'
            : 'Incorrect. Streak reset to 0.',
      )
    } catch {
      setStatusText('Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (loading || submitting || passed) {
        return
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        appendDigit(event.key)
        return
      }

      if (event.key === '-' || event.key === '+') {
        event.preventDefault()
        toggleSign()
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        clearAnswer()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        void submitAnswer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [loading, submitting, passed, answer, sessionId, questionId])

  return (
    <main className="page">
      <section className="card" aria-live="polite">
        <header className="header">
          <h1>Home Math Trainer</h1>
          <p>20 correct in a row. Any mistake resets you to zero.</p>
        </header>

        <div className="progressBlock">
          <div className="progressLabel">
            <span>Streak</span>
            <strong>
              {streak}/{targetStreak}
            </strong>
          </div>
          <div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={targetStreak} aria-valuenow={streak}>
            <div className="progressFill" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>

        <div className="questionBox">
          <h2>Question</h2>
          <div className="expression">{questionText || '...'}</div>
        </div>

        <div className="answerDisplay" role="textbox" aria-label="Answer display" aria-readonly="true">
          {answer || 'Enter answer'}
        </div>

        <div className="actionsRow">
          <button type="button" className="ghost" onClick={clearAnswer} disabled={loading || submitting || passed}>
            Clear
          </button>
          <button type="button" className="primary" onClick={() => void submitAnswer()} disabled={!canSubmit}>
            {submitting ? 'Checking...' : 'Submit'}
          </button>
        </div>

        <div className="keypad" aria-label="Keypad">
          {keypadRows.map((row, rowIndex) => (
            <div className="keypadRow" key={`row-${rowIndex}`}>
              {row.map((key) => (
                <button
                  type="button"
                  key={key}
                  className={`key ${key === 'back' ? 'danger' : ''}`}
                  onClick={() => handleKeypadPress(key)}
                  disabled={loading || submitting || passed}
                >
                  {key === 'back' ? '⌫' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {feedback && (
          <section className={`feedback ${feedback.isCorrect ? 'ok' : 'bad'}`}>
            <div className="feedbackTop">
              <strong>{feedback.isCorrect ? '✓ Correct' : '✗ Incorrect'}</strong>
              <span>Correct answer: {feedback.correctAnswer}</span>
            </div>
            <div className="feedbackBottom">
              <span>Your answer: {feedback.submittedAnswer || '(empty)'}</span>
              {feedback.parseError && <span>{feedback.parseError}</span>}
            </div>
          </section>
        )}

        <p className="statusText">{statusText}</p>

        {!sessionId && !loading && (
          <button type="button" className="ghost" onClick={() => void startSession()}>
            Retry Connection
          </button>
        )}

        {passed && (
          <button type="button" className="restart" onClick={() => void startSession()}>
            Start New Challenge
          </button>
        )}
      </section>
    </main>
  )
}

export default App
