# Home Math Trainer

Container-ready web app for LAN hosting (OMV-friendly) with a math challenge game.

## Implemented v1

- One challenge type: signed integer addition/subtraction with brackets, for example `(+7) - (-3)`.
- Keypad-first input for mobile use.
- Physical keyboard support (digits, `+`, `-`, `Backspace`, `Enter`, `Escape`) without relying on focused text input.
- Submit feedback shows:
  - correct answer
  - check or X state
- Pass rule: 20 correct in a row.
- Any mistake resets streak to 0.

## Project Structure

- `apps/web`: React + TypeScript + Vite frontend.
- `apps/api`: Fastify API with per-session streak state.
- `packages/challenge-engine`: shared challenge generation and answer parsing logic.

## Local Run

From repository root:

```bash
npm install
npm run dev:api
npm run dev:web
```

Open the Vite URL printed in terminal (usually `http://localhost:5173`).

## Build and Test

```bash
npm run build
npm test
```

## Container Deployment (OMV)

Use compose from repository root:

```bash
docker compose build
docker compose up -d
```

Default external port is `8080` and can be overridden:

```bash
HOST_PORT=8181 docker compose up -d
```

Then browse on LAN:

- `http://<omv-lan-ip>:8080` (or your configured host port)

## API Endpoints

- `POST /api/session/start`
- `POST /api/session/:sessionId/answer`
- `GET /health`

## Notes

- Session state is in-memory (per running API container) for v1.
- No user accounts or persistence in this version.
