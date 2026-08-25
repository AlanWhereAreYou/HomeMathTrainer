FROM node:24-slim AS web-build
WORKDIR /app/apps/web

COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install --include=optional
COPY apps/web ./
RUN npm run build

FROM node:24-slim AS engine-build
WORKDIR /app/packages/challenge-engine

COPY packages/challenge-engine/package.json ./
RUN npm install
COPY packages/challenge-engine ./
RUN npm run build

FROM node:24-slim AS api-build
WORKDIR /app/apps/api

COPY apps/api/package.json ./
COPY --from=engine-build /app/packages/challenge-engine /app/packages/challenge-engine
RUN npm install
COPY apps/api ./
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app

COPY --from=api-build /app/apps/api/package.json ./apps/api/package.json
COPY --from=api-build /app/apps/api/dist ./apps/api/dist
COPY --from=api-build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=engine-build /app/packages/challenge-engine ./packages/challenge-engine
COPY --from=web-build /app/apps/web/dist ./apps/web/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
