FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/challenge-engine/package.json ./packages/challenge-engine/package.json
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages/challenge-engine ./packages/challenge-engine
RUN npm install --workspaces --include-workspace-root=false
RUN npm run build -w packages/challenge-engine
RUN npm run build -w apps/web
RUN npm run build -w apps/api

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/challenge-engine/package.json ./packages/challenge-engine/package.json
COPY --from=build /app/packages/challenge-engine/dist ./packages/challenge-engine/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
