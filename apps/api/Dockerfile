FROM node:24-slim AS build
WORKDIR /app

COPY . .
# Use npm install with optional deps so Linux-native rolldown bindings are present in CI.
RUN npm install --include=optional
RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/challenge-engine/package.json ./packages/challenge-engine/package.json
COPY --from=build /app/packages/challenge-engine/dist ./packages/challenge-engine/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
