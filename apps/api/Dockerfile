FROM node:24-slim AS build
WORKDIR /app

COPY . .
# Use npm install with optional deps so Linux-native rolldown bindings are present in CI.
RUN npm install --include=optional
# Work around npm optional dependency resolution bug by installing the exact Linux rolldown binding explicitly.
RUN ROLLDOWN_VERSION=$(node -p "require('./apps/web/node_modules/rolldown/package.json').version") \
	&& npm install --no-save "@rolldown/binding-linux-x64-gnu@${ROLLDOWN_VERSION}"
# Work around the same optional dependency bug for vite css minification native binding.
RUN LIGHTNINGCSS_VERSION=$(node -p "require('./apps/web/node_modules/lightningcss/package.json').version") \
	&& npm install --no-save "lightningcss-linux-x64-gnu@${LIGHTNINGCSS_VERSION}"
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
