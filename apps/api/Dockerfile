FROM node:24-alpine AS build
WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build

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
